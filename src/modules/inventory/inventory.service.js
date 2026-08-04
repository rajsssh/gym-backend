import { pool } from "../../config/db.js";

// Create new product
export const createProductService = async (data) => {
  const { name, sku, category, sellingPrice, costPrice, openingStock = 0, branchId } = data;

  if (sku) {
    const [exists] = await pool.query(`SELECT id FROM product WHERE sku = ?`, [sku]);
    if (exists.length > 0) throw { status: 400, message: "SKU already exists" };
  }

  const [result] = await pool.query(
    `INSERT INTO product (name, sku, category, sellingPrice, costPrice, currentStock, branchId) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, sku, category, sellingPrice, costPrice, openingStock, branchId]
  );

  const productId = result.insertId;

  if (openingStock > 0) {
    await pool.query(
      `INSERT INTO stockmovement (productId, type, quantity, note) VALUES (?, 'OPENING', ?, 'Opening stock')`,
      [productId, openingStock]
    );
  }

  const [product] = await pool.query(`SELECT * FROM product WHERE id = ?`, [productId]);
  return product[0];
};

// List products
export const listProductsService = async (branchId, search) => {
  let sql = `SELECT * FROM product WHERE branchId = ? AND isActive = 1`;
  const params = [branchId];

  if (search) {
    sql += ` AND (name LIKE ? OR sku LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ` ORDER BY id DESC`;

  const [rows] = await pool.query(sql, params);
  return rows;
};

// Update product
export const updateProductService = async (id, data) => {
  const { name, sku, category, sellingPrice, costPrice, isActive } = data;

  if (sku) {
    const [exists] = await pool.query(`SELECT id FROM product WHERE sku = ? AND id != ?`, [sku, id]);
    if (exists.length > 0) throw { status: 400, message: "SKU already in use" };
  }

  await pool.query(
    `UPDATE product SET name = ?, sku = ?, category = ?, sellingPrice = ?, costPrice = ?, isActive = ? WHERE id = ?`,
    [name, sku, category, sellingPrice, costPrice, isActive, id]
  );

  const [product] = await pool.query(`SELECT * FROM product WHERE id = ?`, [id]);
  return product[0];
};

// Adjust stock
export const adjustStockService = async ({ productId, type, quantity, note }) => {
  const [products] = await pool.query(`SELECT * FROM product WHERE id = ?`, [productId]);
  if (products.length === 0) throw { status: 404, message: "Product not found" };

  let delta = quantity;
  if (type === "SALE" || type === "OUT") delta = -Math.abs(quantity);
  else if (type === "PURCHASE" || type === "IN") delta = Math.abs(quantity);
  // ADJUSTMENT can be + or - as sent

  const newStock = products[0].currentStock + delta;
  if (newStock < 0) throw { status: 400, message: "Insufficient stock" };

  await pool.getConnection(async (conn) => {
    try {
      await conn.beginTransaction();
      await conn.query(
        `INSERT INTO stockmovement (productId, type, quantity, note) VALUES (?, ?, ?, ?)`,
        [productId, type, delta, note]
      );
      await conn.query(`UPDATE product SET currentStock = ? WHERE id = ?`, [newStock, productId]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  const [movement] = await pool.query(
    `SELECT * FROM stockmovement WHERE productId = ? ORDER BY id DESC LIMIT 1`,
    [productId]
  );

  return movement[0];
};

// Product stock history
export const productHistoryService = async (productId) => {
  const [products] = await pool.query(`SELECT * FROM product WHERE id = ?`, [productId]);
  if (products.length === 0) throw { status: 404, message: "Product not found" };

  const [movements] = await pool.query(
    `SELECT * FROM stockmovement WHERE productId = ? ORDER BY id DESC`,
    [productId]
  );

  return { ...products[0], movements };
};
