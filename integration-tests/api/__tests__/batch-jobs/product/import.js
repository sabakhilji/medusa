const fs = require("fs")
const path = require("path")

const setupServer = require("../../../../helpers/setup-server")
const { useApi } = require("../../../../helpers/use-api")
const { initDb, useDb } = require("../../../../helpers/use-db")

const adminSeeder = require("../../../helpers/admin-seeder")
const batchJobSeeder = require("../../../helpers/batch-job-seeder")
const userSeeder = require("../../../helpers/user-seeder")

const adminReqConfig = {
  headers: {
    Authorization: "Bearer test_token",
  },
}

jest.setTimeout(1000000)

function cleanTempData() {
  // cleanup tmp ops files
  const opsFiles = path.resolve("__tests__", "batch-jobs", "product", "imports")

  fs.rmSync(opsFiles, { recursive: true, force: true })
}

describe("Product import batch job", () => {
  let medusaProcess
  let dbConnection

  beforeAll(async () => {
    const cwd = path.resolve(path.join(__dirname, "..", "..", ".."))
    dbConnection = await initDb({ cwd })

    cleanTempData() // cleanup if previous process didn't manage to do it

    medusaProcess = await setupServer({
      cwd,
      redisUrl: "redis://127.0.0.1:6379",
      uploadDir: __dirname,
      verbose: false,
    })
  })

  afterAll(async () => {
    const db = useDb()
    await db.shutdown()

    cleanTempData()

    medusaProcess.kill()
  })

  beforeEach(async () => {
    try {
      await batchJobSeeder(dbConnection)
      await adminSeeder(dbConnection)
      await userSeeder(dbConnection)
    } catch (e) {
      console.log(e)
      throw e
    }
  })

  afterEach(async () => {
    const db = useDb()
    await db.teardown()
  })

  it("should import a csv file", async () => {
    jest.setTimeout(1000000)
    const api = useApi()

    const response = await api.post(
      "/admin/batch-jobs",
      {
        type: "product-import",
        context: {
          fileKey: "product-import.csv",
        },
      },
      adminReqConfig
    )

    const batchJobId = response.data.batch_job.id

    expect(batchJobId).toBeTruthy()

    // Pull to check the status until it is completed
    let batchJob
    let shouldContinuePulling = true
    while (shouldContinuePulling) {
      const res = await api.get(
        `/admin/batch-jobs/${batchJobId}`,
        adminReqConfig
      )

      await new Promise((resolve, _) => {
        setTimeout(resolve, 1000)
      })

      batchJob = res.data.batch_job

      shouldContinuePulling = !(
        batchJob.status === "completed" || batchJob.status === "failed"
      )
    }

    expect(batchJob.status).toBe("completed")

    const productsResponse = await api.get("/admin/products", adminReqConfig)

    expect(productsResponse.data.count).toBe(2)
    expect(productsResponse.data.products).toEqual([
      expect.objectContaining({
        id: "O6S1YQ6mKm",
        title: "Test product",
        description: "test-product-description-1",
        handle: "test-product-product-1",
        is_giftcard: false,
        status: "draft",
        thumbnail: "test-image.png",
        variants: [
          expect.objectContaining({
            title: "Test variant",
            product_id: "O6S1YQ6mKm",
            sku: "test-sku-1",
            barcode: "test-barcode-1",
            ean: null,
            upc: null,
            inventory_quantity: 10,
            prices: [
              expect.objectContaining({
                currency_code: "eur",
                amount: 100,
                region_id: "region-product-import-0",
              }),
              expect.objectContaining({
                currency_code: "usd",
                amount: 110,
              }),
              expect.objectContaining({
                currency_code: "dkk",
                amount: 130,
                region_id: "region-product-import-1",
              }),
            ],
            options: [
              expect.objectContaining({
                value: "option 1 value red",
              }),
              expect.objectContaining({
                value: "option 2 value 1",
              }),
            ],
          }),
        ],
        images: [
          expect.objectContaining({
            url: "test-image.png",
          }),
        ],
        options: [
          expect.objectContaining({
            title: "test-option-1",
            product_id: "O6S1YQ6mKm",
          }),
          expect.objectContaining({
            title: "test-option-2",
            product_id: "O6S1YQ6mKm",
          }),
        ],
        tags: [
          expect.objectContaining({
            value: "123_1",
          }),
        ],
      }),
      expect.objectContaining({
        id: "5VxiEkmnPV",
        title: "Test product",
        description: "test-product-description",
        handle: "test-product-product-2",
        is_giftcard: false,
        status: "draft",
        thumbnail: "test-image.png",
        profile_id: expect.any(String),
        variants: [
          expect.objectContaining({
            title: "Test variant",
            product_id: "5VxiEkmnPV",
            sku: "test-sku-2",
            barcode: "test-barcode-2",
            ean: null,
            upc: null,
            inventory_quantity: 10,
            allow_backorder: false,
            manage_inventory: true,
            prices: [
              expect.objectContaining({
                currency_code: "dkk",
                amount: 110,
                region_id: "region-product-import-2",
              }),
            ],
            options: [
              expect.objectContaining({
                value: "Option 1 value 1",
              }),
            ],
          }),
          expect.objectContaining({
            title: "Test variant",
            product_id: "5VxiEkmnPV",
            sku: "test-sku-3",
            barcode: "test-barcode-3",
            ean: null,
            upc: null,
            inventory_quantity: 10,
            allow_backorder: false,
            manage_inventory: true,
            prices: [
              expect.objectContaining({
                currency_code: "usd",
                amount: 120,
                region_id: null,
              }),
            ],
            options: [
              expect.objectContaining({
                value: "Option 1 Value blue",
              }),
            ],
          }),
        ],
        images: [
          expect.objectContaining({
            url: "test-image.png",
          }),
        ],
        options: [
          expect.objectContaining({
            title: "test-option",
            product_id: "5VxiEkmnPV",
          }),
        ],
        tags: [
          expect.objectContaining({
            value: "123",
          }),
        ],
      }),
    ])
  })
})
