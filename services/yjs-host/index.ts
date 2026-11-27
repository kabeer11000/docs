import { Server } from "@hocuspocus/server"
import jwt from "jsonwebtoken"
import { MongoClient } from "mongodb"
import { accessFor, type DocumentAccess } from "./access"

const PORT = parseInt(process.env.PORT || "1234")
const PUBLIC_KEY = (process.env.JWT_PUBLIC_KEY || "").replace(/\\n/g, "\n")
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"
const DB_NAME = process.env.DOCS_DB || "kabeers-docs-cl"

if (!PUBLIC_KEY) throw new Error("JWT_PUBLIC_KEY is required")

const documents = new MongoClient(MONGODB_URI)
  .connect()
  .then((client) => client.db(DB_NAME).collection<DocumentAccess & { id: string }>("documents"))

// No persistence on purpose: the database (written by the editors' autosave) is the source of
// truth. A room lives only while someone is connected; the first editor in seeds it from the
// database. Stored Yjs state could be older than the database and would win on load.
const server = new Server({
  port: PORT,
  quiet: true,

  async onAuthenticate({ token, documentName, connectionConfig }) {
    let claims: jwt.JwtPayload
    try {
      claims = jwt.verify(token, PUBLIC_KEY, { algorithms: ["ES256"], clockTolerance: 30 }) as jwt.JwtPayload
    } catch {
      throw new Error("invalid token")
    }
    if (claims.token_type !== "access" || typeof claims.user_id !== "string") throw new Error("invalid token")

    const doc = await (await documents).findOne(
      { id: documentName },
      { projection: { owner: 1, sharing: 1 } },
    )
    const access = accessFor(doc, { id: claims.user_id, email: claims.email })
    if (!access) throw new Error("forbidden")
    connectionConfig.readOnly = access === "read"
    return { userId: claims.user_id }
  },
})

server.listen().then(() => console.log(`Hocuspocus listening on ${PORT}`))
