export async function clearAllCollections (collections) {
  for (const collection of Object.values(collections)) {
    await collection.deleteMany({})
  }
}
