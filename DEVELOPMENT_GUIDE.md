# Development Guide - Windows Node.js Process Management

## Problem: Multiple Node.js Processes Causing Slow Compilation

When running `npm run dev`, you may notice multiple Node.js processes in Task Manager and slow compilation. This is normal on Windows with Turbopack.

## Solutions

### Option 1: Kill All Node.js Processes (Recommended)
Use the provided batch script before starting dev server:

```bash
kill-node.bat
```

Then start the dev server:
```bash
npm run dev
```

### Option 2: Use npm scripts to kill manually
Open Command Prompt:
```bash
taskkill /F /IM node.exe
```

Wait 3 seconds, then:
```bash
npm run dev
```

### Option 3: Clean Next.js Cache if compilation stuck
```bash
npm run clean-next
npm run dev
```

## Optimizations Applied

1. **Disabled unnecessary Telemetry**: Reduced background processes
2. **Increased Memory Limit**: Set NODE_OPTIONS=--max-old-space-size=4096
3. **Clean Cache Management**: Regular cache cleanup prevents accumulation
4. **Port Release**: Wait between killing processes and restarting

## Best Practices

- **Always** kill previous Node.js processes before starting new dev server
- **Don't** force-close VS Code while dev server is running
- **Close browser tabs** properly (don't just minimize)
- Use `kill-node.bat` as first step when experiencing issues

## Normal Behavior

You WILL see multiple Node.js processes in Task Manager - this is **normal** for Next.js development. Each component may spawn its own process for hot-reloading. The key is they should not accumulate indefinitely.
