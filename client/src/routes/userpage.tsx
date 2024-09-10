import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Portfolio } from "../types/portfolio";
import { endpoint } from "..";
import { PortfolioComponent } from "../components/Portfolio";

export function Userpage() {
  const {userid} = useParams();
  const [portfolio, setPortfolio] = useState<Portfolio|string|null>(null);

  useEffect(() => {
    (async () => {
      let url = `${endpoint}/api/get_portfolio?username=${userid}`;
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

  return <PortfolioComponent initialPortfolio={portfolio} setPortfolio={null} />
}