# collab editor

a real-time collaborative text editor built with react and yjs

multiple people can edit the same document at the same time and see each others cursors and changes instantly. documents are saved automatically so you can close the tab and come back later and everything is still there

---

## tech stack

**frontend**
- react 18
- vite
- tiptap (rich text editor — bold italic headings etc)
- yjs (conflict-free real-time sync)
- @hocuspocus/provider (websocket client for yjs)
- tailwindcss

**backend**
- fastify (node.js http server)
- @hocuspocus/server (websocket server for yjs)
- prisma (database orm)
- postgresql (stores documents and snapshots)

**infra**
- docker compose (runs postgres locally)
- npm workspaces (monorepo — client / server / shared)

---

## requirements

- node 18+
- docker desktop — download at https://www.docker.com/products/docker-desktop

---

## how to run it

**1. clone the repo**
```bash
git clone <repo-url>
cd collab-editor
```

**2. start postgres**

make sure docker desktop is open and running then

```bash
docker compose up -d
```

**3. set up the database**
```bash
cd server
npx prisma db push
cd ..
```

**4. install dependencies**
```bash
npm install
```

**5. start the server**

open a terminal and run
```bash
cd server
npm run dev
```

**6. start the client**

open another terminal and run
```bash
cd client
npm run dev
```

**7. open the app**

go to http://localhost:5173

---

## try the collaboration

open http://localhost:5173 in two browser windows side by side

- each window will ask for a display name and a cursor color
- start typing in one window and watch it update in the other one instantly
- you can see who else is in the document in the sidebar on the right
- close a tab and reopen the same url — your document is still there

---

## project structure

```
collab-editor/
  client/     # react frontend
  server/     # fastify backend + websocket
  shared/     # shared types
  shared/legacy/  # original hand-rolled rga crdt (kept for reference)
```
