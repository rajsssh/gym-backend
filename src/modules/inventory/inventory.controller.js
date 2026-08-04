import {
  createProductService,
  listProductsService,
  updateProductService,
  adjustStockService,
  productHistoryService,
} from "./inventory.service.js";

export const createProduct = async (req, res, next) => {
  try {
    const product = await createProductService(req.body);
    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
};

export const listProducts = async (req, res, next) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const search = req.query.search || "";

    const products = await listProductsService(branchId, search);
    res.json({ success: true, products });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const product = await updateProductService(id, req.body);
    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
};

export const adjustStock = async (req, res, next) => {
  try {
    const movement = await adjustStockService(req.body);
    res.json({ success: true, movement });
  } catch (err) {
    next(err);
  }
};

export const productHistory = async (req, res, next) => {
  try {
    const productId = parseInt(req.params.productId);
    const product = await productHistoryService(productId);
    res.json({ success: true, product });
  } catch (err) {
    next(err);
  }
};
