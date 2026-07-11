/**
 * PM2 Ecosystem Config
 *
 * Cluster mode: PM2 spawns one worker per CPU core.
 * Cron jobs run ONLY on worker 0 (NODE_APP_INSTANCE=0).
 * All other workers skip cron to prevent duplicate execution.
 */
module.exports = {
  apps: [
    {
      name: 'nexusbid-api',
      script: 'dist/config/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '512M',
      watch: false,
      env_production: {
        NODE_ENV: 'prod',
        PORT: 3000,
        // PM2 automatically sets NODE_APP_INSTANCE to 0, 1, 2, ... per worker
        // server.ts reads this to decide whether to start cron jobs
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
        instances: 1,
        exec_mode: 'fork',
        watch: ['dist'],
        watch_delay: 1000,
        ignore_watch: ['node_modules', 'logs'],
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
