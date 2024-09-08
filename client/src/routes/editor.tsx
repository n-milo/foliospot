import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { endpoint } from "..";
import { PortfolioComponent } from "../components/Portfolio";
import { Portfolio } from "../types/portfolio";
import { Link } from "react-router-dom";
import { Label, RangeSlider, Select, Tabs } from "flowbite-react";
import {HiCheck, HiOutlinePencil, HiOutlinePencilAlt, HiGlobeAlt} from "react-icons/hi";
import {HiGlobeAmericas, HiPaintBrush} from "react-icons/hi2";
import { defaultTheme } from "../themes/theme";

const colors = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose"
];

const strengths = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950
];

export function Editor() {
  const [portfolio, setPortfolio] = useState<Portfolio|string|null>(null);
  const [saveStatus, setSaveStatus] = useState("");
  const [editable, setEditable] = useState(true);

  const [sidebarColor, setSidebarColor] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("");
  const [projectColor, setProjectColor] = useState("");
  const [accentColor, setAccentColor] = useState("");
  // const [sidebarDark, setSidebarDark] = useState(false);
  // const [mainDark, setMainDark] = useState(false);

  const theme = useMemo(
    () => defaultTheme(sidebarColor, backgroundColor, projectColor, accentColor),
    [sidebarColor, backgroundColor, projectColor, accentColor]
  );

  useEffect(() => {
    (async () => {
      let url = `${endpoint}/api/get_portfolio`;
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

  // return <div>
  //   <div className="p-2 grid grid-cols-3 border-b-2 border-black bg-slate-200">
  //     <span className="">
  //       {editable ? saveStatus : "You are viewing the public version of your portfolio."}
  //     </span>
  //     <Link className="mx-auto" to={editable ? "/view" : "/editor"}>
  //       {editable ? "View publically" : "Back to editor"}
  //     </Link>
  //     <a className="ml-auto" href={`${endpoint}/api/logout`}>Logout</a>
  //   </div>
  //   <PortfolioComponent initialPortfolio={portfolio} editable={editable} setSaveStatus={setSaveStatus} />
  // </div>;

  return <Tabs style="fullWidth" className="editor-tabs gap-0" onActiveTabChange={e => {
    if (e === 3) window.location.href = `${endpoint}/api/logout`;
  }}>
    <Tabs.Item active title="Editor" className="py-3" icon={HiOutlinePencilAlt}>
      <PortfolioComponent theme={theme} initialPortfolio={portfolio} setPortfolio={setPortfolio} editable={true} setSaveStatus={setSaveStatus} />
    </Tabs.Item>
    <Tabs.Item title="Public Mode" icon={HiGlobeAmericas}>
      <PortfolioComponent theme={theme} initialPortfolio={portfolio} setPortfolio={setPortfolio} editable={false} setSaveStatus={setSaveStatus} />
    </Tabs.Item>
    <Tabs.Item title="Theme Editor" icon={HiPaintBrush}>
      <div className="flex max-w-md flex-col gap-2 mt-8 m-auto">
        <h1 className="text-2xl font-bold">Theme Editor</h1>
        <Label value="Sidebar text" />
        {/* <Select onChange={e => setSidebarDark(e.target.selectedIndex === 1)}>
          <option>Dark</option>
          <option>Light</option>
        </Select>
        <Label value="Main page text" />
        <Select onChange={e => setMainDark(e.target.selectedIndex === 1)}>
          <option>Dark</option>
          <option>Light</option>
        </Select> */}
        <Label value="Sidebar color" />
        <ColorPicker initial={[7, 4]} setColor={setSidebarColor} />
        <Label value="Background color" />
        <ColorPicker initial={[0, 0]} setColor={setBackgroundColor} />
        <Label value="Project color" />
        <ColorPicker initial={[1, 1]} setColor={setProjectColor} />
        <Label value="Project hover color" />
        <ColorPicker initial={[2, 2]} setColor={setAccentColor} />
      </div>
    </Tabs.Item>
    <Tabs.Item title="Logout" onClick={() => window.location.href = `${endpoint}/api/logout`}>
    </Tabs.Item>
  </Tabs>
}

function ColorPicker({setColor, initial}: {setColor?: (color: string) => void, initial: [number, number]}) {
  const [selected, setSelected] = useState(initial);
  useEffect(() => {
    if (setColor)
      setColor(`${colors[selected[0]]}-${strengths[selected[1]]}`)
  }, [selected]);
  return <table className="p-2">
    <tbody>
      {colors.map((c, i) => <tr key={i}>
        {strengths.map((s, j) => {
          let isSelected = i === selected[0] && j === selected[1];
          return <td key={j} className={`
            bg-${c}-${s} w-4 h-4 cursor-pointer hover:outline-2 hover:outline-double outline-[#ff0000]
            ${isSelected && "outline-2 outline-double outline-[#00ffff]"}
          `} onClick={() => setSelected([i, j])} />;
        })}
      </tr>)}
    </tbody>
  </table>
}

function toTitleCase(text: string) {
  return text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
}
