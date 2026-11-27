import { Socket } from "socket.io";
import { IDeleteConfig, IInsertConfig, IUpdateConfig, IGetConfig } from "@/types";
import MongoDatabasePromise from "@/db-internals/mongo-client";
import { authorizeInsert, authorizeRead, authorizeWrite, claimsOf, Ctx } from "@/access";

/** Access context for one request; lookups run against the same database. */
export async function contextFor(socket: Socket<any, any>, database: string, collection: string): Promise<Ctx> {
    const db = (await MongoDatabasePromise).db(database);
    return {
        claims: claimsOf(socket), database, collection,
        find: (name, query, projection) => db.collection(name).find(query, { projection }).toArray(),
    };
}

export async function UpdateHandler(socket: Socket<any, any>, config: IUpdateConfig) {
    const ref = config?.updatable?.ref?.id;
    try {
        const { database, collection, query: { structured } } = config.updatable;
        const ctx = await contextFor(socket, database.name, collection.name);
        const data = structured.update?.data;
        const query = await authorizeWrite(ctx, "update", structured.where, data);
        const coll = (await MongoDatabasePromise).db(database.name).collection(collection.name);
        const result = config.updatable.type === "kn.cloudstore.document"
            ? await coll.updateOne(query, { $set: data })
            : await coll.updateMany(query, { $set: data });
        socket.emit("update-cb-" + ref, { status: true, result });
    } catch (error) {
        socket.emit("update-cb-" + ref, { status: false, error: error?.message || 'Update failed' });
    }
}

export async function DeleteHandler(socket: Socket<any, any>, config: IDeleteConfig) {
    try {
        const ctx = await contextFor(socket, config.database.name, config.collection.name);
        const query = await authorizeWrite(ctx, "delete", config.query.structured.where);
        const coll = (await MongoDatabasePromise).db(config.database.name).collection(config.collection.name);
        const result = config.type === "kn.cloudstore.document" ? await coll.deleteOne(query) : await coll.deleteMany(query);
        socket.emit("delete-cb-" + config.ref.id, { status: true, result });
    } catch (error) {
        socket.emit("delete-cb-" + config?.ref?.id, { status: false, error: error?.message || 'Delete failed' });
    }
}

export async function GetHandler(socket: Socket<any, any>, config: IGetConfig) {
    try {
        const ctx = await contextFor(socket, config.database.name, config.collection.name);
        const { query, projection } = await authorizeRead(ctx, config.query.structured.where);
        const coll = (await MongoDatabasePromise).db(config.database.name).collection(config.collection.name);
        const data = config.type === "kn.cloudstore.document"
            ? await coll.findOne(query, { projection })
            : await coll.find(query, { projection }).toArray();
        socket.emit("get-cb-" + config.ref.id, { status: true, data });
    } catch (error) {
        socket.emit("get-cb-" + config?.ref?.id, { status: false, error: error?.message || 'Get failed' });
    }
}

export async function InsertHandler(socket: Socket<any, any>, config: IInsertConfig) {
    if (!config?.ref) {
        socket.emit("insert-cb-unknown", { status: false, error: 'Config invalid, event ref not attached' });
        return;
    }
    try {
        const ctx = await contextFor(socket, config.database.name, config.collection.name);
        const documents = (config.insertions || []).map(({ data }) => data);
        await authorizeInsert(ctx, documents);
        const result = await (await MongoDatabasePromise).db(config.database.name).collection(config.collection.name).insertMany(documents, {});
        socket.emit("insert-cb-" + config.ref.id, { status: true, result });
    } catch (error) {
        socket.emit("insert-cb-" + config.ref.id, { status: false, error: error?.message || 'Insert failed' });
    }
}
