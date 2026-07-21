import { NextResponse } from "next/server";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { executablePath } from "puppeteer";
import * as cheerio from "cheerio";

puppeteer.use(StealthPlugin());

function extractPlatform(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    if (hostname.includes("upwork.com")) return "Upwork";
    if (hostname.includes("onlinejobs.ph")) return "OnlineJobs.ph";
    if (hostname.includes("fiverr.com")) return "Fiverr";
    if (hostname.includes("freelancer.com")) return "Freelancer";
    if (hostname.includes("toptal.com")) return "Toptal";
    if (hostname.includes("guru.com")) return "Guru";
    if (hostname.includes("linkedin.com")) return "LinkedIn";
    return hostname.split(".")[0].charAt(0).toUpperCase() + hostname.split(".")[0].slice(1);
  } catch {
    return "Unknown";
  }
}

function extractBudget(text: string): string {
  const patterns = [
    /\$\s?\d+(?:,\d{3})*(?:\.\d{2})?(?:\s*-\s*\$\s?\d+(?:,\d{3})*(?:\.\d{2})?)?/,
    /(?:USD|US\$)\s?\d+(?:,\d{3})*(?:\.\d{2})?/,
    /(?:budget|rate|price|salary|range)[:\s]+\$?\d+/i,
    /fixed[- ]?price[:\s]+\$?\d+/i,
    /(?:hourly|per hour)[:\s]+\$?\d+/i,
  ];
  for (const p of patterns) {
    const match = text.match(p);
    if (match) return match[0].trim();
  }
  return "";
}

export async function POST(request: Request) {
  let browser;
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let validUrl: URL;
    try {
      validUrl = new URL(url);
      if (!["http:", "https:"].includes(validUrl.protocol)) throw new Error();
    } catch {
      return NextResponse.json({ error: "Invalid URL. Please enter a valid http or https link." }, { status: 400 });
    }

    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-blink-features=AutomationControlled"],
      executablePath: await executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await new Promise((r) => setTimeout(r, 2000));

    const html = await page.content();
    await browser.close();
    browser = undefined;

    const $ = cheerio.load(html);

    let title =
      $("h1").first().text().trim() ||
      $('[itemprop="title"]').first().text().trim() ||
      $(".job-title").first().text().trim() ||
      $(".job-header h2").first().text().trim() ||
      $("title").first().text().trim();

    if (!title) {
      return NextResponse.json({ error: "Could not read job data from this URL. Please check the link and try again." }, { status: 400 });
    }

    let description =
      $('[itemprop="description"]').first().text().trim() ||
      $(".description").first().text().trim() ||
      $("#job-description").first().text().trim() ||
      $('[data-test="job-description"]').first().text().trim() ||
      $("main").first().text().trim() ||
      $("body").first().text().trim();

    description = description.slice(0, 2000).trim();

    const pageText = $("body").text();
    const budget = extractBudget(pageText);
    const platform = extractPlatform(url);

    return NextResponse.json({
      title,
      description,
      budget: budget || "",
      platform,
      url,
    });
  } catch (err: any) {
    if (browser) {
      try { await browser.close(); } catch {}
    }
    return NextResponse.json(
      { error: `Failed to import job: ${err?.message ?? "Unknown error"}. Please check the URL and try again.` },
      { status: 500 }
    );
  }
}
