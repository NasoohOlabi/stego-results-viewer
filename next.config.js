/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
	// Dev tunnels (Cloudflare quick tunnel / ngrok) send a public Host header.
	allowedDevOrigins: [
		"*.trycloudflare.com",
		"*.ngrok-free.app",
		"*.ngrok.io",
		"*.ngrok.app",
	],
};

export default config;
