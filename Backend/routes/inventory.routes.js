const express = require("express");
const router = express.Router();
const inventoryController = require("../controllers/inventory.controller");
const { authMiddleWare } = require("../middlewares/auth.middleware");
const { adminOnly } = require("../middlewares/admin.middleware");

// Protect all routes with auth and admin middlewares
router.use(authMiddleWare, adminOnly);

router.get("/", inventoryController.getAllInventory);
router.post("/", inventoryController.addInventoryItem);
router.put("/:id", inventoryController.updateInventoryItem);
router.delete("/:id", inventoryController.deleteInventoryItem);

module.exports = router;
