import { Portfolio } from "../types/portfolio";

export type Theme = any;

export const defaultTheme = (portfolio: Portfolio) => {
  const {
    sidebarColor,
    backgroundColor,
    projectColor,
    accentColor,
    font
  } = portfolio;

  // sidebarColor: string, backgroundColor: string, projectColor: string, accentColor: string
  const sidebarDark = +sidebarColor.split("-")[1] > 500;
  const mainDark = +backgroundColor.split("-")[1] > 500;
  const projectDark = +projectColor.split("-")[1] > 500;

  return {
    holder: `flex flex-col sm:flex-row gap-4 font-${font} bg-${backgroundColor} ${mainDark ? "text-white" : "text-black"}`,
    sidebar: `bg-${sidebarColor} p-8 sm:min-h-screen w-screen sm:w-80 ${sidebarDark ? "text-white" : "text-black"}`,
    firstName: "text-3xl font-black w-full",
    lastName: "text-3xl font-black mb-6 w-full",
    bioLink: {
      base: "inline-flex items-baseline mb-4",
      icon: "self-center w-5 h-5",
      text: "",
    },
    sidebarSeparator: `mb-2 pb-2 border-b-2 ${sidebarDark ? "border-white" : "border-black"}`,
    mainContent: "w-screen h-full p-8 pl-4",
    section: {
      title: "mb-4 font-black text-xl flex-grow",
      list: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-4 overflow-auto",
      add: "min-h-[4rem]",
      separator: `mb-4 ${mainDark ? "border-white" : "border-black"}`,
    },
    project: {
      item: `group text-left bg-${projectColor} hover:bg-${accentColor} transition rounded-2xl mb-0 pb-0 min-h-64 ${projectDark ? "text-white" : "text-black"}`,
      content: "rounded-2xl p-4 pb-0 h-min",
      title: "font-extrabold flex-grow min-w-0",
      description: "min-h-20 mb-4",
      image: "my-2",
      add: "min-h-[8.5rem]",
    },
    button: {
      add: "border-4 hover:border-blue-200 border-dashed rounded-2xl w-full text-3xl font-extralight p-0 m-0",
      delete: {
        base: "group/button rounded-lg p-1 max-h-7 border-2 border-black hover:bg-red-500 hover:border-white transition",
        icon: "min-w-4 w-4 h-4 max-h-4 group-hover/button:invert transition-all",
      },
    },
    uploadableImage: {
      container: "relative flex w-full h-64 items-center justify-center",
      image: "rounded-xl max-w-full max-h-full object-contain",
      deleteButton: `absolute top-3 right-3 z-10 bg-red-500 border-none`,
    },
    dropzone: {
      base: "flex relative h-64 p-8 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed",
      active: "bg-blue-200 border-blue-600 cursor-copy",
      inactive: `${projectDark ? "border-gray-600 bg-gray-700 hover:border-gray-500 hover:bg-gray-600" : "bg-gray-50 border-gray-300 hover:bg-gray-100"}`,
      icon: "mb-4 h-8 w-8 text-gray-500 dark:text-gray-400",
      text: {
        main: "mb-2 text-sm text-gray-500 dark:text-gray-400",
        highlight: "font-semibold",
        subtext: "text-xs text-gray-500 dark:text-gray-400",
      },
    },
    textarea: "w-full p-0 bg-inherit border-none resize-none outline-none shadow-none overflow-hidden",
    addButton: "border-4 hover:border-blue-200 border-dashed rounded-2xl w-full text-3xl font-extralight p-0 m-0",
    iconButton: {
      base: `group/button rounded-lg p-1 max-h-7 border-2 ${projectDark ? "border-white" : "border-black"} hover:bg-red-500 hover:border-white transition`,
      icon: `min-w-4 w-4 h-4 max-h-4 group-hover/button:invert transition-all`
    },
    markdownPreview: {
      container: "min-h-16 cursor-text hover:outline-2 outline-black hover:outline-dashed",
      placeholder: "text-gray-600 font-mono",
    }
  };
}