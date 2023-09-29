const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const app = express();
app.use(express.json());
let db = null;
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

const initiateDB = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3001, () => {
      console.log("It's Running...");
    });
  } catch (e) {
    console.log(`Error is ${e.message}`);
    process.exit(1);
  }
};
initiateDB();

function authentication(request, response, next) {
  let jwtToken;
  const check = request.headers["authorization"];
  if (check !== undefined) {
    const splitting = check.split(" ");
    jwtToken = splitting[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "http5css5", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
}
//API-1
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const query = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(query);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const checkPass = await bcrypt.compare(password, dbUser.password);
    if (checkPass === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "http5css5");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});
//API-2
app.get("/states/", authentication, async (request, response) => {
  const query = `SELECT * FROM state;`;
  const array = await db.all(query);
  const result = (i) => {
    return {
      stateId: i.state_id,
      stateName: i.state_name,
      population: i.population,
    };
  };
  response.send(array.map((i) => result(i)));
});
//API-3
app.get("/states/:stateId/", authentication, async (request, response) => {
  const { stateId } = request.params;
  const query = `SELECT * FROM state WHERE state_id = ${stateId};`;
  const array = await db.get(query);
  const result = {
    stateId: array.state_id,
    stateName: array.state_name,
    population: array.population,
  };
  response.send(result);
});
//API-4
app.post("/districts/", authentication, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const query = `INSERT INTO district ("district_name", "state_id", "cases", "cured", "active", "deaths") 
  VALUES ('${districtName}', ${stateId}, ${cases}, ${cured}, ${active}, ${deaths});`;
  const array = await db.run(query);
  response.send("District Successfully Added");
});
///API-5
app.get(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const query = `SELECT * FROM district WHERE district_id = ${districtId};`;
    const array = await db.get(query);
    const result = {
      districtId: array.district_id,
      districtName: array.district_name,
      stateId: array.state_id,
      cases: array.cases,
      cured: array.cured,
      active: array.active,
      deaths: array.deaths,
    };
    response.send(result);
  }
);
//API-6
app.delete(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const query = `DELETE FROM district WHERE district_id = ${districtId};`;
    const array = await db.run(query);
    response.send("District Removed");
  }
);
//API-7
app.put(
  "/districts/:districtId/",
  authentication,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const query = `UPDATE district SET district_name = '${districtName}', state_id = ${stateId}, 
  cases = ${cases}, cured = ${cured}, active = ${active}, deaths = ${deaths} WHERE district_id = ${districtId};`;
    const array = await db.run(query);
    response.send("District Details Updated");
  }
);
//API-8
app.get(
  "/states/:stateId/stats/",
  authentication,
  async (request, response) => {
    const { stateId } = request.params;
    const query = `SELECT SUM(cases), SUM(cured), SUM(active), SUM(deaths) FROM district WHERE state_id = ${stateId};`;
    const array = await db.get(query);
    const result = {
      totalCases: array["SUM(cases)"],
      totalCured: array["SUM(cured)"],
      totalActive: array["SUM(active)"],
      totalDeaths: array["SUM(deaths)"],
    };
    response.send(result);
  }
);

module.exports = app;
