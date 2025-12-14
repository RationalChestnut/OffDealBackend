const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("file-system");

const app = express();
const router = express.Router();
const PORT = process.env.PORT || 5001;
const axios = require("axios");
const path = require("path");

const ExcelJS = require("exceljs");

require("dotenv").config({ path: "./.env" });

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS, PUT"
  );
  next();
});

// Populate spreadsheet with local business name, url, category, email, phone number

const findLocalBusinesses = async (req, res) => {
  const { query } = req.body;
  console.log("Run", query);

  try {
    const response = await axios.post(
      "https://places.googleapis.com/v1/places:searchText",
      { textQuery: query },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.PLACES_API_KEY,
          "X-Goog-FieldMask":
            "places.displayName,places.formattedAddress,places.businessStatus,places.websiteUri,places.nationalPhoneNumber",
        },
      }
    );

    const places = response.data.places || [];

    const rows = places.map((p) => ({
      name: p?.displayName?.text ?? "",
      address: p?.formattedAddress ?? "",
      status: p?.businessStatus ?? "",
      website: p?.websiteUri ?? "",
      phone: p?.nationalPhoneNumber ?? "",
    }));

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Places");

    ws.columns = [
      { header: "Name", key: "name", width: 35 },
      { header: "Address", key: "address", width: 45 },
      { header: "Business Status", key: "status", width: 18 },
      { header: "Website", key: "website", width: 35 },
      { header: "Phone", key: "phone", width: 18 },
    ];

    ws.addRows(rows);
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: "frozen", ySplit: 1 }];

    const buffer = await wb.xlsx.writeBuffer();
    const filename = "places.xlsx";

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", buffer.length);

    return res.status(200).send(Buffer.from(buffer));
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      worked: false,
      error: "Failed to generate spreadsheet",
    });
  }
};

// const findBusinessEmail = async (websiteURL) => {
//   try {
//     const browser = await puppeteer.launch({ headless: false });
//     const page = await browser.newPage();

//     await page.goto(websiteURL);

//     const html = await page.content();
//     console.log(websiteURL);
//     // console.log(html);

//     await browser.close();
//   } catch (error) {
//     console.log(error);
//   }
// };

router.post("/find", findLocalBusinesses);

app.use("/", router);

app.listen(PORT, () => {
  console.log(`Server running on Port ${PORT}`);
});
