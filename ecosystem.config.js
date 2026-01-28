module.exports = {
  apps: [
    {
      name: "everfresh-admin",
      script: "dist/Server.js",

      // Always run from project root
      cwd: "/var/www/everfresh-admin",

      // One instance (good for DB-backed apps)
      instances: 1,
      exec_mode: "fork",

      // Restart safety
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 5000,

      // Node settings
      interpreter: "node",
      node_args: "--max-old-space-size=512",

      // Logs
      error_file: "logs/pm2-error.log",
      out_file: "logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",

      // Environment
      env: {
        NODE_ENV: "production",
        PORT: 5000
      }
    }
  ]
};
