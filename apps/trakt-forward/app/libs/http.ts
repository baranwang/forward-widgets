import axios from "axios";
import { TRAKT_BASE_URL } from "./constants";

export const http = axios.create({
  baseURL: TRAKT_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "User-Agent": "Forward Widget/1.0.0",
    "trakt-api-version": "2",
    "trakt-api-key": process.env.TRAKT_API_KEY,
  },
  adapter: "fetch",
});
