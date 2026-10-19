import { Server } from "@hocuspocus/server"
import * as Y from "yjs"
import fs from "fs"
import path from "path"

const PORT = parseInt(process.env.PORT || "1234")
const DATA_DIR = path.resolve("./data") // folder to store docs
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

const server = new Server({
  port: PORT,
  quiet: false,

  // Load document from file if exists
  async onLoadDocument(data) {
    const filePath = path.join(DATA_DIR, `${data.documentName}.bin`)
    if (fs.existsSync(filePath)) {
      console.log(`Loading document: ${data.documentName}`)
      const content = fs.readFileSync(filePath)
      const doc = new Y.Doc()
      Y.applyUpdate(doc, content)
      return doc
    }
    console.log(`Creating new document: ${data.documentName}`)
    return null // new document
  },

  // Save document whenever it changes
  async onStoreDocument(data) {
    const filePath = path.join(DATA_DIR, `${data.documentName}.bin`)
    const update = Y.encodeStateAsUpdate(data.document)
    fs.writeFileSync(filePath, update)
    console.log(`Stored document: ${data.documentName}`)
  },

  // Debug connections
  async onConnect({ documentName }) {
    console.log(`Client connected: ${documentName}`)
  },

  async onDisconnect({ documentName }) {
    console.log(`Client disconnected: ${documentName}`)
  },

  async onUpdate({ documentName }) {
    console.log(`Document updated: ${documentName}`)
  },
})

console.log(`Starting Hocuspocus server on port ${PORT}...`)
server.listen().then(() => {
  console.log(`Hocuspocus server is running on port ${PORT}`)
})
