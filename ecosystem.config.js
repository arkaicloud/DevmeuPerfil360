module.exports = {
  apps: [{
    name: 'meuperfil360',
    script: 'dist/index.js',
    cwd: '/home/meuperfil360/app',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/home/meuperfil360/logs/err.log',
    out_file: '/home/meuperfil360/logs/out.log',
    log_file: '/home/meuperfil360/logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    watch: false,
    ignore_watch: ['node_modules', 'logs'],
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};