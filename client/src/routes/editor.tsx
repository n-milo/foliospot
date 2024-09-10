import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { endpoint } from "..";
import { PortfolioComponent } from "../components/Portfolio";
import { Font, Portfolio } from "../types/portfolio";
import { Link } from "react-router-dom";
import { Label, RangeSlider, Select, Tabs, Toast } from "flowbite-react";
import {HiCheck, HiOutlinePencil, HiOutlinePencilAlt, HiGlobeAlt, HiInformationCircle, HiExclamation} from "react-icons/hi";
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

const fonts: Font[] = ["sans", "serif", "mono"];

const fontNames = {
  sans: "Sans-serif",
  serif: "Serif",
  mono: "Monospaced"
};

const colorNamesToIndex = colors.reduce((acc, color, index) => {
  acc[color] = index;
  return acc;
}, {} as { [K: string]: number });

const strengths = [
  50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950
];

const strengthsToIndex = strengths.reduce((acc, strength, index) => {
  acc[strength] = index;
  return acc;
}, {} as { [K: number]: number });

export type SaveStatus = {
  info: string
} | {
  error: string
};

export function Editor() {
  const [portfolio, setPortfolio] = useState<Portfolio|string|null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus|null>(null);

  const statusMessage = (s: SaveStatus) => ('info' in s) ? s.info : s.error;

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

  const updatePortfolio = (portfolio: Portfolio) => {
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
          setSaveStatus({info: "Saved!"});
        } else {
          setSaveStatus({error: `Failed to save: ${r.status} ${r.statusText}`});
        }
      })
      .catch(e => {
        console.error(e);
        setSaveStatus({error: `Failed to save: ${e}`});
      })
  };

  return <>
  <Tabs style="fullWidth" className="editor-tabs gap-0" onActiveTabChange={e => {
    setSaveStatus(null);
    if (e === 3) window.location.href = `${endpoint}/api/logout`;
  }}>
    <Tabs.Item active title="Editor" className="py-3" icon={HiOutlinePencilAlt}>
      <PortfolioComponent initialPortfolio={portfolio} setPortfolio={updatePortfolio} />
    </Tabs.Item>
    <Tabs.Item title="Public Mode" icon={HiGlobeAmericas}>
      <PortfolioComponent initialPortfolio={portfolio} setPortfolio={null} />
    </Tabs.Item>
    <Tabs.Item title="Theme Editor" icon={HiPaintBrush}>
      <div className="flex max-w-md flex-col gap-2 mt-8 m-auto">
        <h1 className="text-2xl font-bold">Theme Editor</h1>
        <Label value="Font style" />
        <FontPicker portfolio={portfolio} setPortfolio={updatePortfolio} />
        <Label value="Sidebar color" />
        <ColorPicker portfolio={portfolio} setPortfolio={updatePortfolio} field={"sidebarColor"} />
        <Label value="Background color" />
        <ColorPicker portfolio={portfolio} setPortfolio={updatePortfolio} field={"backgroundColor"} />
        <Label value="Project color" />
        <ColorPicker portfolio={portfolio} setPortfolio={updatePortfolio} field={"projectColor"} />
        <Label value="Project hover color" />
        <ColorPicker portfolio={portfolio} setPortfolio={updatePortfolio} field={"accentColor"} />
      </div>
    </Tabs.Item>
    <Tabs.Item title="Logout" onClick={() => window.location.href = `${endpoint}/api/logout`}>
    </Tabs.Item>
  </Tabs>
  {saveStatus !== null && <Toast className="fixed left-4 bottom-4">
    <div>
      {'info' in saveStatus &&
        <HiInformationCircle className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-cyan-100 bg-cyan-500" />}
      {'error' in saveStatus &&
        <HiExclamation className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-100 bg-red-500" />}
    </div>
    <div className="ml-4">{statusMessage(saveStatus)}</div>
    <Toast.Toggle onDismiss={() => setSaveStatus(null)} />
  </Toast>}
  </>;
}

function FontPicker({portfolio, setPortfolio}: {portfolio: Portfolio, setPortfolio: (p: Portfolio) => void}) {
  return <Select value={fontNames[portfolio.font]} onChange={e => {
    setPortfolio({
      ...portfolio,
      font: fonts[e.target.selectedIndex]
    })
  }}>
    <option>Sans-serif</option>
    <option>Serif</option>
    <option>Monospaced</option>
  </Select>
}

type ColorField = {
  [K in keyof Portfolio]: Portfolio[K] extends string ? K : never
}[keyof Portfolio];

function ColorPicker({portfolio, setPortfolio, field}: {portfolio: Portfolio, setPortfolio: (p: Portfolio) => void, field: ColorField}) {
  const color = portfolio[field];
  const split = color.split("-");

  const selected = [
    colorNamesToIndex[split[0]],
    strengthsToIndex[+split[1]]
  ];

  const setSelected = ([i, j]: [number, number]) => {
    const p: Portfolio = {
      ...portfolio,
      [field]: `${colors[i]}-${strengths[j]}`,
    };

    setPortfolio(p);
  }

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
