package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/alexedwards/scs/sqlite3store"
	"github.com/alexedwards/scs/v2"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/mattn/go-sqlite3"
	"github.com/nfnt/resize"
	"github.com/rwcarlsen/goexif/exif"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

func Must[T any](t T, err error) T {
	if err != nil {
		panic(fmt.Sprintf("unexpected error: %s", err.Error()))
	}
	return t
}

func Require(err error) {
	if err != nil {
		panic(fmt.Sprintf("unexpected error: %s", err.Error()))
	}
}

func ErrorOf[T any](t T, err error) error {
	return err
}

func CreateSet[T comparable](ts ...T) map[T]struct{} {
	val := make(map[T]struct{})
	for _, t := range ts {
		val[t] = struct{}{}
	}
	return val
}

type Portfolio struct {
	FirstName string    `json:"firstName"`
	LastName  string    `json:"lastName"`
	Location  string    `json:"location"`
	Bio       string    `json:"bio"`
	Sections  []Section `json:"sections"`

	SidebarColor    string `json:"sidebarColor"`
	BackgroundColor string `json:"backgroundColor"`
	ProjectColor    string `json:"projectColor"`
	AccentColor     string `json:"accentColor"`
	Font            string `json:"font"`
}

type Section struct {
	Title    string    `json:"title"`
	Projects []Project `json:"projects"`
}

type Project struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	ImageURL    string `json:"imageURL,omitempty"`
	Link        string `json:"link,omitempty"`
}

var defaultPortfolio = Portfolio{
	Sections:        make([]Section, 0),
	SidebarColor:    "amber-400",
	BackgroundColor: "slate-50",
	ProjectColor:    "slate-100",
	AccentColor:     "slate-200",
	Font:            "sans",
}

var db *sql.DB
var sessionManager *scs.SessionManager
var s3svc *s3.S3

var frontend string

var (
	googleOauthConfig *oauth2.Config
	oauthStateString  = "random-state-string"
)

func writeHeaders(w http.ResponseWriter, r *http.Request, method string) bool {
	w.Header().Set("Access-Control-Allow-Origin", frontend)
	w.Header().Set("Access-Control-Allow-Methods", method+", OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return true
	} else if r.Method != method {
		http.Error(w, "wrong method", http.StatusBadRequest)
		return true
	}

	return false
}

// savePortfolio stores the portfolio p under the user with UUID id.
// User must exist.
func savePortfolio(id uuid.UUID, p Portfolio) error {
	j, err := json.Marshal(p)
	if err != nil {
		return err
	}

	t := time.Now().Format(time.RFC3339)
	result, err := db.Exec(`
		UPDATE users
		SET portfolio = ?,
			last_saved = ?
		WHERE uuid = ?;
	`, j, t, id.String())

	if err != nil {
		return err
	}

	nrows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if nrows == 0 {
		return fmt.Errorf("user with UUID %s not found", id)
	}

	return nil
}

// getLogin returns the UUID behind an authorized request r, or an error if the
// request is not authorized.
func getLogin(r *http.Request) (uuid.UUID, error) {
	userid := sessionManager.GetString(r.Context(), "userid")
	if userid == "" {
		return uuid.Nil, fmt.Errorf("not logged in")
	}

	id, err := uuid.Parse(userid)
	if err != nil {
		// saved userid is bad, delete it
		sessionManager.Remove(r.Context(), "userid")
		return uuid.Nil, fmt.Errorf("bad user id")
	}

	return id, nil
}

func putPortfolioHandler(w http.ResponseWriter, r *http.Request) {
	if writeHeaders(w, r, "POST") {
		return
	}

	id, err := getLogin(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	var p Portfolio

	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(&p); err != nil {
		http.Error(w, "could not parse json", http.StatusBadRequest)
		return
	}

	if err := savePortfolio(id, p); err != nil {
		http.Error(w, "could not save portfolio", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func getPortfolioHandler(w http.ResponseWriter, r *http.Request) {
	if writeHeaders(w, r, "GET") {
		return
	}

	username := r.URL.Query().Get("username")
	var row *sql.Row
	if username != "" {
		row = db.QueryRow(`SELECT portfolio FROM users WHERE username = ?;`, username)
	} else {
		id, err := getLogin(r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusUnauthorized)
			return
		}

		row = db.QueryRow(`SELECT portfolio FROM users WHERE uuid = ?;`, id)
	}

	var j string
	if err := row.Scan(&j); err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "not found", http.StatusNotFound)
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
		return
	}

	var portfolio Portfolio
	if err := json.Unmarshal([]byte(j), &portfolio); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(portfolio)
}

func getLoginHandler(w http.ResponseWriter, r *http.Request) {
	if writeHeaders(w, r, "GET") {
		return
	}

	id, err := getLogin(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	var exists bool
	if err := db.QueryRow(`SELECT EXISTS(SELECT 1 FROM users WHERE uuid = ?);`, id).Scan(&exists); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if !exists {
		sessionManager.Remove(r.Context(), "userid")
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	w.WriteHeader(http.StatusOK)
}

var reservedNames = CreateSet[string]("", "api", "auth", "signup", "login", "editor", "p", "blog")

func isUsernameAvailable(name string) (bool, error) {
	if len(name) < 2 || len(name) > 16 {
		return false, nil
	}

	if _, ok := reservedNames[name]; ok {
		return false, nil
	}

	var exists bool
	if err := db.QueryRow(`SELECT EXISTS(SELECT 1 FROM users WHERE username = ?);`, name).Scan(&exists); err != nil {
		return false, err
	}

	return !exists, nil
}

func checkUsernameAvailableHandler(w http.ResponseWriter, r *http.Request) {
	if writeHeaders(w, r, "GET") {
		return
	}

	avail, err := isUsernameAvailable(r.URL.Query().Get("username"))
	if err != nil {
		http.Error(w, "error checking username: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if avail {
		w.Write([]byte("true"))
	} else {
		w.Write([]byte("false"))
	}
}

var imageExtensions = map[string]string{
	"image/jpeg": "jpg",
	"image/png":  "png",
}

func uploadImageHandler(w http.ResponseWriter, r *http.Request) {
	if writeHeaders(w, r, "POST") {
		return
	}

	id, err := getLogin(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}
	_ = id // TODO: save image in portfolio

	ctype := r.Header.Get("Content-Type")
	ext, ok := imageExtensions[ctype]
	if !ok {
		http.Error(w, "wrong image format (only PNG and JPEG are supported)", http.StatusBadRequest)
		return
	}

	t := time.Now()
	filename := strings.Replace(t.Format("20060102150405.0000"), ".", "", 1) + "." + ext

	var buf bytes.Buffer
	if _, err := io.Copy(&buf, http.MaxBytesReader(nil, r.Body, 5*1024*1024)); err != nil {
		if _, ok := err.(*http.MaxBytesError); ok {
			http.Error(w, "image too large (5MB max)", http.StatusBadRequest)
		} else {
			http.Error(w, "internal server error", http.StatusInternalServerError)
		}
		return
	}

	// url, err := saveImageToS3(buf.Bytes(), filename, ctype)
	// if err != nil {
	// 	http.Error(w, "internal server error", http.StatusInternalServerError)
	// 	return
	// }

	// go func() {
	resized, err := resizeImage(buf.Bytes(), ext)
	if err != nil {
		log.Printf("error resizing image: %v\n", err)
		return
	}

	resizedUrl, err := saveImageToS3(resized, filename, ctype)
	if err != nil {
		log.Printf("error saving resized image to s3: %v\n", err)
	}

	url := resizedUrl

	// if resizedUrl != url {
	// 	log.Printf("warning: resized url does not match old (%s != %s)", resizedUrl, url)
	// }

	log.Printf("uploaded resized image %s\n", resizedUrl)
	// }()

	log.Printf("uploaded image with id %s\n", filename)
	resp := struct {
		URL string `json:"url"`
	}{
		URL: url,
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(Must(json.Marshal(resp)))
}

const imageResizeHeight = 512
const imageJpegQuality = 100

func resizeImage(imgData []byte, ext string) ([]byte, error) {
	img, _, err := image.Decode(bytes.NewReader(imgData))
	if err != nil {
		return nil, err
	}

	var exifData *exif.Exif
	if ext == "jpg" {
		exifData, err = exif.Decode(bytes.NewReader(imgData))
		if err != nil {
			exifData = nil
		}
	}

	resized := resize.Resize(0, imageResizeHeight, img, resize.Lanczos3)

	var buf bytes.Buffer

	switch ext {
	case "jpg":
		err = encodeJPEG(&buf, resized, exifData)
	case "png":
		err = png.Encode(&buf, resized)
	default:
		return nil, fmt.Errorf("unsupported image extension .%s", ext)
	}

	if err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

func encodeJPEG(w *bytes.Buffer, m image.Image, exifData *exif.Exif) error {
	opts := jpeg.Options{
		Quality: imageJpegQuality,
	}

	var tmp bytes.Buffer
	if err := jpeg.Encode(&tmp, m, &opts); err != nil {
		return err
	}

	if exifData == nil {
		io.Copy(w, &tmp)
		return nil
	}

	w.Write(tmp.Bytes()[:2]) // JPEG header

	// EXIF data
	w.Write([]byte{0xFF, 0xE1})
	exifLength := uint16(len(exifData.Raw) + 2)
	w.Write([]byte{uint8(exifLength >> 8), uint8(exifLength & 0xFF)})
	w.Write(exifData.Raw)

	// rest of jpeg
	w.Write(tmp.Bytes()[2:])
	return nil
}

func saveImageToS3(imgData []byte, filename, contentType string) (string, error) {
	if _, err := s3svc.PutObject(&s3.PutObjectInput{
		Bucket:               aws.String("foliopage-images"),
		Key:                  aws.String(filename),
		Body:                 bytes.NewReader(imgData),
		ContentType:          aws.String(contentType),
		ContentDisposition:   aws.String("attachment"),
		ServerSideEncryption: aws.String("AES256"),
	}); err != nil {
		return "", err
	}

	return fmt.Sprintf("https://foliopage-images.s3.amazonaws.com/%s", filename), nil
}

func handleGoogleSignup(w http.ResponseWriter, r *http.Request) {
	if writeHeaders(w, r, "GET") {
		return
	}

	username := r.URL.Query().Get("username")
	avail, err := isUsernameAvailable(username)
	if err != nil {
		http.Error(w, "error checking username: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if !avail {
		http.Error(w, "bad username", http.StatusBadRequest)
		return
	}

	state := fmt.Sprintf("%s:%s", oauthStateString, username)
	url := googleOauthConfig.AuthCodeURL(state)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func handleGoogleLogin(w http.ResponseWriter, r *http.Request) {
	if writeHeaders(w, r, "GET") {
		return
	}

	url := googleOauthConfig.AuthCodeURL(oauthStateString)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func handleGoogleCallback(w http.ResponseWriter, r *http.Request) {
	if writeHeaders(w, r, "GET") {
		return
	}

	state := r.FormValue("state")
	stateParts := strings.Split(state, ":")
	if stateParts[0] != oauthStateString {
		http.Error(w, "invalid OAuth state", http.StatusBadRequest)
		return
	}

	code := r.FormValue("code")
	token, err := googleOauthConfig.Exchange(r.Context(), code)
	if err != nil {
		http.Redirect(w, r, frontend+"/", http.StatusTemporaryRedirect)
		return
	}

	res, err := http.Get("https://www.googleapis.com/oauth2/v2/userinfo?access_token=" + url.QueryEscape(token.AccessToken))
	if err != nil {
		http.Error(w, "could not get OAuth response", http.StatusInternalServerError)
		return
	}

	defer res.Body.Close()

	var userInfo struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(res.Body).Decode(&userInfo); err != nil {
		http.Error(w, "could not parse OAuth response", http.StatusInternalServerError)
		return
	}

	/*
		here either the email exists or not, and either we entered through the login
		flow (len(stateParts) == 1, username not provided) or the signup flow
		(len(stateParts) == 2, username provided)

		this gives us 4 possible states:

		1. email exists, login flow
		-> log user in

		2. email does not exist, signup flow
		-> create new user in database
		-> log user in

		3. email exists, signup flow
		-> log user into existing account and tell them

		4. email does not exist, login flow
		-> send user back to signup page to fill out a username
		   TODO POST-MVP: this signup page requests a sign in with Google again
			 maybe make a separate page solely for finishing signup (although this
			 flow is niche)

	*/

	var existingUsername string
	var idstr string

	emailExists := true
	if err := db.QueryRow(`SELECT username, uuid FROM users WHERE email = ?;`, userInfo.Email).Scan(&existingUsername, &idstr); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			emailExists = false
		} else {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	loginFlow := len(stateParts) < 2

	if !emailExists && loginFlow {
		// case 4
		http.Redirect(w, r, frontend+"/signup?finish=true", http.StatusTemporaryRedirect)
		return
	}

	if !emailExists && !loginFlow {
		// create new user in database (case 2)
		username := stateParts[1]
		log.Printf("creating new user %s (%s)\n", username, userInfo.Email)
		portfolio := Must(json.Marshal(defaultPortfolio))
		now := time.Now().Format(time.RFC3339)
		id := uuid.New()
		idstr = id.String()

		if _, err := db.Exec(`
				INSERT INTO users (uuid, email, username, signup_time, signup_ip, signup_agent, portfolio, last_saved)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?)
			`,
			idstr,
			userInfo.Email,
			username,
			now,
			r.RemoteAddr,
			r.UserAgent(),
			portfolio,
			now,
		); err != nil {
			if sqliteErr, ok := err.(sqlite3.Error); ok {
				if sqliteErr.ExtendedCode == sqlite3.ErrConstraintUnique {
					// username got taken by someone else
					http.Redirect(w, r, frontend+"/signup?error=true", http.StatusTemporaryRedirect)
					return
				}
			}

			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	// case 1, 2, or 3

	if err := sessionManager.RenewToken(r.Context()); err != nil {
		http.Error(w, "failed to renew session token", http.StatusInternalServerError)
		return
	}

	sessionManager.Put(r.Context(), "userid", idstr)

	if emailExists && !loginFlow {
		// case 3
		http.Redirect(w, r, frontend+"/editor?existing_login="+existingUsername, http.StatusTemporaryRedirect)
	} else {
		// case 1 or 2
		http.Redirect(w, r, frontend+"/editor", http.StatusTemporaryRedirect)
	}

}

func logoutHandler(w http.ResponseWriter, r *http.Request) {
	if writeHeaders(w, r, "GET") {
		return
	}

	if err := sessionManager.RenewToken(r.Context()); err != nil {
		http.Error(w, "failed to renew session token", http.StatusInternalServerError)
		return
	}
	sessionManager.Remove(r.Context(), "userid")
	http.Redirect(w, r, frontend+"/", http.StatusTemporaryRedirect)
}

func main() {
	Require(godotenv.Load())

	frontend = os.Getenv("FRONTEND_HOST")
	backend := os.Getenv("SERVER_HOST")

	awsSession := session.Must(session.NewSession())
	s3svc = s3.New(awsSession)

	db = Must(sql.Open("sqlite3", os.Getenv("DATABASE_LOCATION")))

	Must(db.Exec(`
		CREATE TABLE IF NOT EXISTS sessions (
			token TEXT PRIMARY KEY,
			data BLOB NOT NULL,
			expiry REAL NOT NULL
		);
	`))

	Must(db.Exec(`CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expiry);`))

	Must(db.Exec(`
		CREATE TABLE IF NOT EXISTS users (
			uuid TEXT PRIMARY KEY,
			email TEXT NOT NULL UNIQUE,
			username TEXT NOT NULL UNIQUE,
			signup_time TEXT,
			signup_ip TEXT,
			signup_agent TEXT,
			portfolio TEXT NOT NULL,
			last_saved TEXT NOT NULL
		);
	`))

	googleOauthConfig = &oauth2.Config{
		RedirectURL:  backend + "/auth/google/callback",
		ClientID:     os.Getenv("GOOGLE_OAUTH_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_OAUTH_CLIENT_SECRET"),
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
		},
		Endpoint: google.Endpoint,
	}

	sessionManager = scs.New()
	sessionManager.Lifetime = 24 * time.Hour
	sessionManager.Store = sqlite3store.New(db)

	mux := http.NewServeMux()

	mux.HandleFunc("/api/put_portfolio", putPortfolioHandler)
	mux.HandleFunc("/api/get_portfolio", getPortfolioHandler)
	mux.HandleFunc("/api/get_login", getLoginHandler)
	mux.HandleFunc("/api/logout", logoutHandler)
	mux.HandleFunc("/api/upload_image", uploadImageHandler)
	mux.HandleFunc("/auth/google/signup", handleGoogleSignup)
	mux.HandleFunc("/auth/google/login", handleGoogleLogin)
	mux.HandleFunc("/auth/google/callback", handleGoogleCallback)
	mux.HandleFunc("/api/check_username", checkUsernameAvailableHandler)

	log.Println("running on port 8000")
	log.Fatalln(http.ListenAndServe(":8000", sessionManager.LoadAndSave(mux)))
}
