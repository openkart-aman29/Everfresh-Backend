// PM2 process definition for the Everfresh API.
//
// Runs on two machines now: LXC 102 behind nginx, and the Windows/IIS box
// behind ARR. Nothing here is specific to either - see `cwd` below.
//
// Usage:  pm2 start ecosystem.config.js
//         pm2 save

module.exports = {
  apps: [
    {
      name: "everfresh-admin",
      script: "dist/Server.js",

      // The repo's own directory, whatever that happens to be. This was an
      // absolute Linux path, which silently put the working directory in the
      // wrong place on Windows. `__dirname` resolves to the same
      // /var/www/everfresh-admin on LXC 102 and to C:\inetpub\... on the IIS
      // box, so one file serves both.
      //
      // It matters because the Winston logger builds its directory from
      // process.cwd(): started from the wrong place, logs land somewhere like
      // C:\Windows\System32\logs and look like they vanished. The env file is
      // unaffected - ENV_Configuration resolves envs/.env from __dirname.
      cwd: __dirname,

      // One instance, deliberately - not a default worth changing.
      //
      // SSE_Manager keeps its connected clients in an in-memory array, so a
      // second worker would hold its own set of clients and broadcast only to
      // those. Events raised on one worker would never reach panels connected
      // to the other, and the failure looks like "live updates work sometimes".
      // The token cleanup scheduler would also run once per worker.
      instances: 1,
      exec_mode: "fork",

      // Restart policy, shaped around how this app actually fails.
      //
      // Server.ts calls process.exit(1) when the database is unreachable, so a
      // database blip reads to PM2 as a crash. A fixed 5s delay burned the
      // whole restart budget inside a minute and left the app stopped even
      // after the database came back. Exponential backoff spaces the attempts
      // out, and min_uptime resets the counter once a start survives 30s, so a
      // transient outage heals itself instead of needing a hand.
      autorestart: true,
      watch: false,
      min_uptime: "30s",
      max_restarts: 15,
      exp_backoff_restart_delay: 2000,

      // Node settings. Steady-state RSS is around 75MB, so this cap is roomy;
      // it is here to turn a leak into a restart rather than a dead container.
      interpreter: "node",
      node_args: "--max-old-space-size=512",
      max_memory_restart: "400M",

      // PM2's own capture, separate from the Winston logs in logs/. It catches
      // what Winston cannot: anything thrown before the logger is constructed,
      // and the stack of a hard exit.
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",

      // Note on precedence: PM2 sets these before node starts, and
      // dotenv.config() does not overwrite variables that already exist. So
      // these two win over envs/.env - changing PORT there alone has no
      // effect while it is also set here.
      env: {
        NODE_ENV: "production",
        PORT: 5000
      }
    }
  ]
};
