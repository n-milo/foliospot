import React, {createContext, useContext, useEffect, useState} from 'react';
import {Button, FileInput, Label, Modal} from "flowbite-react";
import {ApiError, endpoint, errorMessage, isError} from "../index";
import Markdown from "react-markdown";
import {Portfolio, defaultSection, defaultProject} from "../types/portfolio";
import {Link} from "react-router-dom";

export function PortfolioView({username, editable}: {
  username?: string,
  editable: boolean,
}) {
  const [portfolio, setPortfolio] = useState<Portfolio|string|null>(null);
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    (async () => {
      let url = `${endpoint}/api/get_portfolio`;
      if (username) {
        url += `?username=${encodeURIComponent(username)}`;
      }

      try {
        let resp = await fetch(url, {
          method: "GET",
          headers: {'Content-Type': 'application/json'},
          credentials: "include",
          mode: "cors"
        });

        if (!resp.ok) {
          setPortfolio(await resp.text());
          return;
        }

        setPortfolio(await resp.json());
      } catch (error) {
        console.log(error);
      }
    })();
  }, []);

  if (portfolio === null) {
    return null;
  } else if (typeof portfolio === "string") {
    return <p>Error: {portfolio}</p>
  }

  const showNavigation = !username;

  return <div>
    {showNavigation && <div className="p-2 grid grid-cols-3 border-b-2 border-black bg-slate-200">
      <span className="">
        {editable ? saveStatus : "You are viewing the public version of your portfolio."}
      </span>
      <Link className="mx-auto" to={editable ? "/view" : "/editor"}>
        {editable ? "View publically" : "Back to editor"}
      </Link>
      <a className="ml-auto" href={`${endpoint}/api/logout`}>Logout</a>
    </div>}
    <PortfolioComponent initialPortfolio={portfolio} editable={editable} setSaveStatus={setSaveStatus} />
  </div>;
}

const EditorContext = createContext<[() => void, boolean]>([() => {}, false]);

type ModalArgs = {
  what: string,
  delete: () => void,
};

export function PortfolioComponent(props: {
  initialPortfolio: Portfolio,
  editable: boolean,
  setSaveStatus: (status: string) => void,
}) {
  const [_portfolio, setPortfolio] = useState(props.initialPortfolio);
  const portfolio: Portfolio = structuredClone(_portfolio);

  const { setSaveStatus } = props;

  const [modal, setModal] = useState<ModalArgs>();

  const updatePortfolio = () => {
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

  return <EditorContext.Provider value={[updatePortfolio, props.editable]} >
    <div>
      <div className={`flex flex-col sm:flex-row gap-4`}>
        <div className={`bg-amber-200 p-8 sm:min-h-screen w-screen sm:w-80`}>
          <EditableField className={"text-3xl font-black w-full "} holder={portfolio} name="firstName"
                         placeholder={"Your"}/>
          <EditableField className={"text-3xl font-black mb-6 w-full "} holder={portfolio} name="lastName"
                         placeholder={"Name"}/>
          <div className={"inline-flex items-baseline mb-4"}>
            <img className={"self-center w-5 h-5"} src={"/icons/icons8-location-48.png"}/>
            <EditableField className={""} holder={portfolio} name="location" placeholder={"Location"}/>
          </div>
          <div className={"mb-2 pb-2 border-b-2 border-b-amber-800"}>
            {/* <Link href={"https://github.com/n-milo"}/> */}
          </div>
          <EditableMarkdown holder={portfolio} name="bio" placeholder="Bio..." />
        </div>
        <div className={"w-screen h-full p-8 pl-4"}>
          {
            portfolio.sections.map((section, i) => <>
              <div className={"w-full flex flex-row"}>
                <EditableField holder={section} name="title" className={"mb-4 font-black text-xl flex-grow"}
                               placeholder={"Section Title..."}/>
                <DeleteButton array={portfolio.sections} index={i} onClick={d => setModal({
                  what: "section and all the projects in it",
                  delete: d,
                })} />
              </div>
              <ul className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-4 overflow-auto`}>
                {section.projects.map((project, j) => <li
                    key={i+","+j}
                    className={"group text-left bg-gray-100 hover:bg-gray-200 transition rounded-2xl mb-0 pb-0 h-min"}
                  >
                    <div className={"rounded-2xl p-4 pb-0 h-min"}>
                      <div className={"w-full flex flex-row"}>
                        <EditableField
                          className="font-extrabold flex-grow min-w-0"
                          holder={project} name="name"
                          placeholder={"Project Title..."}
                        />
                        <DeleteButton array={section.projects} index={j} onClick={d => setModal({
                          what: "project",
                          delete: d
                        })}/>
                      </div>
                      <EditableParagraph
                        className={"min-h-16 mb-4"}
                        holder={project} name="description"
                        placeholder={"Short blurb..."}
                      />
                      <UploadableImage
                        className={"mb-4"}
                        holder={project}
                        name="imageURL"
                        setStatus={setSaveStatus}
                        setModal={setModal}
                      />
                    </div>
                  </li>
                )}
                <li><AddButton array={section.projects} new={defaultProject} className={"min-h-[8.5rem]"}/></li>
              </ul>
              <hr className={"mb-4"}/>
            </>)
          }
          <AddButton array={portfolio.sections} new={defaultSection} className={"min-h-[4rem]"}/>
        </div>
      </div>
    </div>
    <Modal show={!!modal} onClose={() => setModal(undefined)} popup>
      <Modal.Header>Warning</Modal.Header>
      <Modal.Body>
        Are you sure you want to delete this {modal?.what}? This cannot be undone.
      </Modal.Body>
      <Modal.Footer>
        <Button color="failure" onClick={() => {
          modal?.delete();
          setModal(undefined);
        }}>Delete</Button>
        <Button color="gray" onClick={() => setModal(undefined)}>Cancel</Button>
      </Modal.Footer>
    </Modal>
  </EditorContext.Provider>;
}

function UploadableImage<T extends string>(props: {
  holder: { [key in T]?: string },
  name: T,
  className?: string,
  placeholder?: string,
  setStatus: (status: string) => void,
  setModal: (modal: ModalArgs) => void,
}) {
  const [update, editable] = useContext(EditorContext);

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
    } catch (error) {
      alert("Error uploading image: "+error);
      return;
    }
    update();
  };

  return <div className={"relative flex w-full h-64 items-center justify-center " + props.className}>
    {props.holder[props.name]
      ? <>
          <img className="rounded-xl max-w-full max-h-full object-contain" src={props.holder[props.name]} />
          <IconButton
            className="absolute top-3 right-3 z-10 bg-red-500 border-none"
            title="Delete"
            icon="/icons/icons8-delete-30.png"
            onClick={() => props.setModal({
              what: "image",
              delete: () => {
                props.holder[props.name] = "";
                update();
              }
            })}
          />
        </>
      : (editable ? <Dropzone uploadFile={uploadFile} /> : null)}
  </div>
}

function Dropzone(props: {className?: string, uploadFile: (f: File) => void}) {
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
    htmlFor="dropzone-file"
    className={
      "flex relative h-64 p-8 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed "
      + (dragActive
          ? "bg-blue-200 border-blue-600 cursor-copy "
          : "bg-gray-50 border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:hover:border-gray-500 dark:hover:bg-gray-600 "
      )
    }
    onDragEnter={handleDrag}
    onDragLeave={handleDrag}
    onDragOver={handleDrag}
    onDrop={handleDrop}
  >
    <div className="flex flex-col items-center justify-center pb-6 pt-5">
      <svg
        className="mb-4 h-8 w-8 text-gray-500 dark:text-gray-400"
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
      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
        <span className="font-semibold">Click to upload</span> or drag and drop
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">PNG or JPEG. Max 2 MB.</p>
    </div>
    <FileInput
      id="dropzone-file"
      className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
      onChange={handleFileInput}
    />
  </Label>;
}

function SaveIndicator(props: { text: string }) {
  return <div
    className={"absolute left-2 top-2"}
  >
    {props.text}
  </div>
}

function EditableField<T extends string>(props: {
  holder: { [key in T]: string },
  name: T,
  className?: string,
  placeholder?: string,
}) {
  const [update, editable] = useContext(EditorContext);
  if (!editable) {
    return <p className={"bg-inherit " + props.className}>{props.holder[props.name] ?? props.placeholder}</p>
  }
  return <input
    name={props.name}
    className={"bg-inherit " + props.className}
    placeholder={props.placeholder}
    value={props.holder[props.name]}
    onChange={(v) => {
      props.holder[props.name] = v.target.value;
      update();
    }}
  />
}

function EditableParagraph<T extends string>(props: {
  holder: { [key in T]: string },
  name: T,
  className?: string,
  placeholder?: string,
  markdown?: boolean,
}) {
  const [update, editable] = useContext(EditorContext);

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

  return <div className={"max-h-full outline-1 outline-red-400"}>
    <textarea
      name={props.name}
      className={
        "w-full h-full p-0 bg-inherit border-none resize-none outline-none shadow-none "
        + (props.markdown ? "font-mono " : "")
        + props.className
      }
      placeholder={props.placeholder}
      value={props.holder[props.name]}
      onChange={(v) => {
        props.holder[props.name] = v.target.value;
        update();
      }}
    />
  </div>
}

function EditableMarkdown<T extends string>(props: {
  holder: { [key in T]: string },
  name: T,
  className?: string,
  placeholder?: string,
}) {
  const [typing, setTyping] = useState(false);
  const [update, editable] = useContext(EditorContext);
  if (!editable) {
    return <p className={"bg-inherit " + props.className}>{props.holder[props.name]}</p>
  }
  return <div className={"max-h-full outline-1 outline-red-400"}>
    {
      typing
      ? <textarea
        name={props.name}
        className={
          "w-full p-0 bg-inherit border-none resize-none outline-none shadow-none font-mono text-sm "
          + props.className
        }
        placeholder={props.placeholder}
        value={props.holder[props.name]}
        onChange={(v) => {
          props.holder[props.name] = v.target.value;
          update();
        }}
        onBlur={() => setTyping(false)}
        autoFocus
      />
      : <div
          className={"h-screen cursor-text "}
          onClick={() => {
            setTyping(true);
          }}
        >
          <Markdown className="unreset">
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
  const [update, editable] = useContext(EditorContext);

  if (!editable) {
    return null;
  }

  return <button
    className={"border-4 hover:border-blue-200 border-dashed rounded-2xl w-full text-3xl font-extralight p-0 m-0 " + props.className}
    onClick={() => {
      props.array.push(props.new);
      update();
    }}
  >{props.placeholder ?? "+"}</button>
}

function DeleteButton<T>(props: {
  array: T[],
  onClick: (del: () => void) => void,
  index: number,
  className?: string,
}) {
  const [update, editable] = useContext(EditorContext);

  if (!editable) {
    return null;
  }

  return <IconButton
    className={props.className}
    title="Delete"
    icon="/icons/icons8-delete-30.png"
    onClick={() => props.onClick(() => {
      props.array.splice(props.index, 1);
      update();
    })}
  />
}

function IconButton<T>(props: {
  icon: string,
  title: string,
  className?: string,
  onClick?: () => void,
}) {
  const [update, editable] = useContext(EditorContext);
  return <button
    title={props.title}
    className={"group/button rounded-lg p-1 max-h-7 border-2 border-black hover:bg-red-500 hover:border-white transition " + props.className}
    onClick={props.onClick}
  >
    <img className={"min-w-4 w-4 h-4 max-h-4 group-hover/button:invert transition-all"} src={props.icon} />
  </button>;
}
