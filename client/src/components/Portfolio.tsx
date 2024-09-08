import React, {createContext, ReactNode, useContext, useEffect, useRef, useState} from 'react';
import {Button, FileInput, Label, Modal, TextInput} from "flowbite-react";
import { endpoint } from "../index";
import Markdown from "react-markdown";
import {Portfolio, defaultSection, defaultProject, Project} from "../types/portfolio";
import { Theme } from '../themes/theme';
import { HiTrash } from 'react-icons/hi';
import { MdAddLink } from "react-icons/md";
import { on } from 'events';

// export function PortfolioView({username, editable}: {
//   username?: string,
//   editable: boolean,
// }) {
//   const [portfolio, setPortfolio] = useState<Portfolio|string|null>(null);
//   const [saveStatus, setSaveStatus] = useState("");

//   useEffect(() => {
//     (async () => {
//       let url = `${endpoint}/api/get_portfolio`;
//       if (username) {
//         url += `?username=${encodeURIComponent(username)}`;
//       }

//       try {
//         let resp = await fetch(url, {
//           method: "GET",
//           headers: {'Content-Type': 'application/json'},
//           credentials: "include",
//           mode: "cors"
//         });

//         if (!resp.ok) {
//           setPortfolio(await resp.text());
//           return;
//         }

//         setPortfolio(await resp.json());
//       } catch (error) {
//         console.log(error);
//       }
//     })();
//   }, []);

//   if (portfolio === null) {
//     return null;
//   } else if (typeof portfolio === "string") {
//     return <p>Error: {portfolio}</p>
//   }

//   const showNavigation = !username;

//   return <div>
//     {showNavigation && <div className="p-2 grid grid-cols-3 border-b-2 border-black bg-slate-200">
//       <span className="">
//         {editable ? saveStatus : "You are viewing the public version of your portfolio."}
//       </span>
//       <Link className="mx-auto" to={editable ? "/view" : "/editor"}>
//         {editable ? "View publically" : "Back to editor"}
//       </Link>
//       <a className="ml-auto" href={`${endpoint}/api/logout`}>Logout</a>
//     </div>}
//     <PortfolioComponent initialPortfolio={portfolio} editable={editable} setSaveStatus={setSaveStatus} />
//   </div>;
// }

type EditorArg = {
  update: () => void,
  editable: boolean,
  setModal: (m: ReactNode|null) => void,
  theme: Theme,
  gen: number,
  incrementGen: () => void,
}

const EditorContext = createContext<EditorArg>(null!);

type ModalArgs = {
  what: string,
  delete: () => void,
};

export function PortfolioComponent({initialPortfolio, setPortfolio, editable, setSaveStatus, theme}: {
  initialPortfolio: Portfolio,
  setPortfolio: (p: Portfolio) => void,
  editable: boolean,
  setSaveStatus: (status: string) => void,
  theme: Theme,
}) {
  let portfolio: Portfolio = structuredClone(initialPortfolio);

  const [modal, setModal] = useState<ReactNode|null>(null);
  const [gen, setGen] = useState(0);

  const update = () => {
    console.log("saving...");
    console.log(portfolio);
    setSaveStatus("Saving...");
    setPortfolio(portfolio);
    fetch(`${endpoint}/api/put_portfolio`, {
      method: "POST",
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(portfolio),
      credentials: "include",
      mode: "cors"
    })
      .then(r => {
        if (r.status === 200) {
          setSaveStatus("Saved!");
        } else {
          setSaveStatus(`Failed to save: ${r.status} ${r.statusText}`);
        }
      })
      .catch(e => {
        console.error(e);
        setSaveStatus(`Failed to send save request`);
      })
  };

  const incrementGen = () => setGen(gen + 1);

  return <EditorContext.Provider value={{update, editable, setModal, theme, gen, incrementGen}} >
    <div>
      <div className={theme.holder}>
        <div className={theme.sidebar}>
          <Field
            className={theme.firstName}
            holder={portfolio}
            name="firstName"
            placeholder="Your"
          />
          <Field
            className={theme.lastName}
            holder={portfolio}
            name="lastName"
            placeholder="Name"
          />
          <div className={theme.bioLink.base}>
            <img className={theme.bioLink.icon} src="/icons/icons8-location-48.png" alt="Location" />
            <Field
              className={theme.bioLink.text}
              holder={portfolio}
              name="location"
              placeholder="Location"
            />
          </div>
          <div className={theme.sidebarSeparator}></div>
          <MarkdownParagraph holder={portfolio} name="bio" placeholder="Bio..." />
          {editable && <a className="text-xs underline" target="_blank" href="https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax">Markdown help</a>}
        </div>
        <div className={theme.mainContent}>
          {portfolio.sections.map((section, i) => (
            <div key={`${i}-${gen}`}>
              <div className="w-full flex flex-row">
                <Field
                  holder={section}
                  name="title"
                  className={theme.section.title}
                  placeholder="Section Title..."
                />
                <DeleteFromArrayButton what="section and all the projects in it" array={portfolio.sections} index={i} />
              </div>
              <ul className={theme.section.list}>
                {section.projects.map((_, j) => (
                  <ProjectComponent key={`${i}-${j}-${gen}`} projectKey={`${i}-${j}-${gen}`} array={section.projects} index={j} />
                ))}
                <li>
                  <AddButton
                    array={section.projects}
                    new={defaultProject}
                    className={theme.project.add}
                  />
                </li>
              </ul>
              {(i < portfolio.sections.length-1 || editable) && <hr className={theme.section.separator} />}
            </div>
          ))}
          <AddButton
            array={portfolio.sections}
            new={defaultSection}
            className={theme.section.add}
          />
        </div>
      </div>
    </div>
    <Modal show={!!modal} onClose={() => setModal(null)} popup>
      {modal}
    </Modal>
  </EditorContext.Provider>;
}

function DeleteModal({what, onDelete}: {what: string, onDelete: () => void}) {
  const {setModal} = useContext(EditorContext);
  return <>
    <Modal.Header>Warning</Modal.Header>
    <Modal.Body>
      Are you sure you want to delete this {what}? This cannot be undone.
    </Modal.Body>
    <Modal.Footer>
      <Button color="failure" onClick={() => {
        onDelete();
        setModal(undefined);
      }}>Delete</Button>
      <Button color="gray" onClick={() => setModal(undefined)}>Cancel</Button>
    </Modal.Footer>
  </>
}

function ProjectComponent({projectKey, array, index}: {projectKey: string, array: Project[], index: number}) {
  const project = array[index];
  const {editable, theme, setModal, gen} = useContext(EditorContext);

  const inner = <>
    <div className="w-full flex flex-row">
      <Field
        className={theme.project.title}
        holder={project}
        name="name"
        placeholder="Project Title..."
      />
      <EditLinkButton project={project} />
      <DeleteFromArrayButton what="project" array={array} index={index} />
    </div>
    <UploadableImage
      projectKey={projectKey}
      className={"mb-4"}
      holder={project}
      name="imageURL"
    />
    <Paragraph
      className={theme.project.description}
      holder={project}
      name="description"
      placeholder="Short blurb..."
    />
  </>;

  return <li className={theme.project.item}>
    {project.link && !editable
    ? <a className={`${theme.project.content} block`} href={project.link} target="_blank">
      {inner}
    </a>
    : <div className={theme.project.content}>
      {inner}
    </div>}
  </li>
}

function UploadableImage<T extends string>(props: {
  projectKey: string,
  holder: { [key in T]?: string },
  name: T,
  className?: string,
  placeholder?: string,
}) {
  const {update, editable, setModal, theme} = useContext(EditorContext);
  console.log(props.holder);

  const uploadFile = async (f: File) => {
    console.log(f);
    try {
      const resp = await fetch(`${endpoint}/api/upload_image`, {
        method: "POST",
        headers: {'Content-Type': f.type},
        body: f,
        credentials: "include",
        mode: "cors"
      });

      if (!resp.ok) {
        alert("Error uploading image: "+(await resp.text()));
        return;
      }

      const j = await resp.json();

      props.holder[props.name] = j.url;
      console.log(props.holder);
      update();
    } catch (error) {
      alert("Error uploading image: "+error);
      return;
    }
  };

  if (!props.holder[props.name] && !editable) {
    return null;
  }

  return <div className={`${theme.uploadableImage.container} ${props.className}`} onClick={e => console.log(e.target)}>
    {props.holder[props.name]
      ? <>
          <img className={theme.uploadableImage.image} src={props.holder[props.name]} />
          <IconButton
            className={theme.uploadableImage.deleteButton}
            icon={HiTrash}
            title="Delete"
            onClick={() => setModal(<DeleteModal what="image" onDelete={() => {
              props.holder[props.name] = "";
              update();
            }} />)}
          />
        </>
      : (editable ? <Dropzone projectKey={props.projectKey} uploadFile={uploadFile} /> : null)}
  </div>
}

function Dropzone(props: {projectKey: string, className?: string, uploadFile: (f: File) => void}) {
  const key = props.projectKey;
  const {theme} = useContext(EditorContext);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      props.uploadFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      props.uploadFile(file);
    }
  };

  return <Label
    htmlFor={`dropzone-file-${key}`}
    className={`
      ${theme.dropzone.base}
      ${dragActive ? theme.dropzone.active : theme.dropzone.inactive}
    `}
    onDragEnter={handleDrag}
    onDragLeave={handleDrag}
    onDragOver={handleDrag}
    onDrop={handleDrop}
  >
    <div className="flex flex-col items-center justify-center pb-6 pt-5">
      <svg
        className={theme.dropzone.icon}
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 20 16"
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
        />
      </svg>
      <p className={theme.dropzone.text.main}>
        <span className={theme.dropzone.text.highlight}>Click to upload</span> or drag and drop
      </p>
      <p className={theme.dropzone.text.subtext}>PNG or JPEG. Max 2 MB.</p>
    </div>
    <FileInput
      id={`dropzone-file-${key}`}
      className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
      onChange={handleFileInput}
    />
  </Label>;
}


function EditLinkModal({link, setLink}: {link: string, setLink: (l: string) => void}) {
  const {setModal, update} = useContext(EditorContext);
  const inputRef = useRef<HTMLInputElement>(null);
  return <>
    <Modal.Header>Edit Link</Modal.Header>
    <Modal.Body>
      <TextInput ref={inputRef} className="mt-2" defaultValue={link} />
    </Modal.Body>
    <Modal.Footer>
      <Button onClick={() => {
        if (inputRef.current) {
          let link = inputRef.current.value;
          if (!link.startsWith("http"))
            link = "https://" + link;
          setLink(link);
        }
        setModal(null);
      }}>Save</Button>
      <Button color="red" onClick={() => setModal(null)}>Cancel</Button>
    </Modal.Footer>
  </>;
}

function EditLinkButton({project}: {project: Project}) {
  const {setModal, update} = useContext(EditorContext);
  const onClick = () => {
    setModal(<EditLinkModal link={project.link || ""} setLink={(l) => {
      project.link = l;
      update();
    }} />);
  };

  return <IconButton
    icon={MdAddLink}
    title="Change link"
    onClick={onClick}
  />
}

function Field<T extends string>(props: {
  holder: { [key in T]: string },
  name: T,
  className?: string,
  placeholder?: string,
}) {
  const {update, editable} = useContext(EditorContext);
  if (!editable) {
    return <p className={`bg-inherit ${props.className}`}>{props.holder[props.name] ?? props.placeholder}</p>
  }
  return <input
    name={props.name}
    className={`bg-inherit ${props.className}`}
    placeholder={props.placeholder}
    value={props.holder[props.name]}
    onChange={(v) => {
      props.holder[props.name] = v.target.value;
      update();
    }}
  />
}

function Paragraph<T extends string>(props: {
  holder: { [key in T]: string },
  name: T,
  className?: string,
  placeholder?: string,
}) {
  const {update, editable, theme} = useContext(EditorContext);
  const textareaRef = useRef<HTMLTextAreaElement|null>(null);

  useEffect(() => {
    if (editable && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [props.holder[props.name], editable]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    props.holder[props.name] = e.target.value;
    update();
  };

  if (!editable) {
    return <p className={`bg-inherit ${props.className}`}>
      {props.holder[props.name].split('\n').map((line, index) => (
        <React.Fragment key={index}>
          {line}
          {index < props.holder[props.name].split('\n').length - 1 && <br />}
        </React.Fragment>
      ))}
    </p>
  }

  return <div className="outline-1 outline-red-400">
    <textarea
      ref={textareaRef}
      name={props.name}
      className={`${theme.textarea} ${props.className}`}
      placeholder={props.placeholder}
      value={props.holder[props.name]}
      onChange={handleChange}
    />
  </div>
}

function MarkdownParagraph<T extends string>(props: {
  holder: { [key in T]: string },
  name: T,
  className?: string,
  placeholder?: string,
}) {
  const [typing, setTyping] = useState(false);
  const {update, editable, theme} = useContext(EditorContext);
  const textareaRef = useRef<HTMLTextAreaElement|null>(null);

  useEffect(() => {
    if (editable && textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [props.holder[props.name], editable, textareaRef]);

  useEffect(() => {
    if (typing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [typing]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    props.holder[props.name] = e.target.value;
    update();
  };

  if (!editable) {
    return <Markdown className="unreset">{props.holder[props.name]}</Markdown>
  }
  return <div className="max-h-full outline-1 outline-red-400">
    <textarea
      ref={textareaRef}
      name={props.name}
      className={`
        w-full bg-inherit border-none resize-none outline-none shadow-none font-mono text-sm
        ${props.className}
        ${!typing && "hidden"}
      `}
      placeholder={props.placeholder}
      value={props.holder[props.name]}
      onChange={handleChange}
      onBlur={() => setTyping(false)}
    />
    {
      !typing && <div
          className={theme.markdownPreview.container}
          onClick={() => setTyping(true)}
        >
          <Markdown className={"unreset " + (props.holder[props.name] === "" ? theme.markdownPreview.placeholder : "")}>
            {props.holder[props.name] === "" ? "Bio..." : props.holder[props.name]}
          </Markdown>
        </div>
    }
  </div>
}

function AddButton<T>(props: {
  array: T[],
  new: T,
  className?: string,
  placeholder?: string,
}) {
  const {update, editable, theme, incrementGen} = useContext(EditorContext);

  if (!editable) {
    return null;
  }

  return <button
    className={`${theme.addButton} ${props.className}`}
    onClick={() => {
      props.array.push(props.new);
      incrementGen();
      update();
    }}
  >{props.placeholder ?? "+"}</button>
}

function DeleteFromArrayButton<T>(props: {
  array: T[],
  index: number,
  what: string,
  className?: string,
}) {
  const {editable, update, incrementGen, setModal} = useContext(EditorContext);

  if (!editable) {
    return null;
  }

  return <IconButton
    className={props.className}
    title="Delete"
    icon={HiTrash}
    onClick={() => setModal(<DeleteModal what={props.what} onDelete={() => {
      props.array.splice(props.index, 1);
      incrementGen();
      update();
    }} />)}
  />
}

function DeleteButton<T>(props: {
  onClick: () => void,
  className?: string,
}) {
  const {editable, setModal, update, incrementGen} = useContext(EditorContext);

  if (!editable) {
    return null;
  }

  return <IconButton
    className={props.className}
    title="Delete"
    icon={HiTrash}
    onClick={props.onClick}
  />
}

function IconButton<T>(props: {
  icon: React.ComponentType<{className?: string}>,
  title: string,
  className?: string,
  onClick?: () => void,
}) {
  const {theme, editable} = useContext(EditorContext);
  if (!editable) {
    return null;
  }
  return <button
    title={props.title}
    className={`${theme.iconButton.base} ${props.className}`}
    onClick={props.onClick}
  >
    <props.icon className={theme.iconButton.icon} />
  </button>;
}
