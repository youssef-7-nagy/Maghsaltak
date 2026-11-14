const Inventory = require("../models/Inventory");

exports.getAllInventory = async (req, res) => {
  try {
    const inventory = await Inventory.find().sort({ updatedAt: -1 });
    res.status(200).json({ status: "success", data: inventory });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.addInventoryItem = async (req, res) => {
  try {
    const { name, category, currentStock, threshold, unit } = req.body;
    const newItem = new Inventory({ name, category, currentStock, threshold, unit });
    await newItem.save();
    res.status(201).json({ status: "success", data: newItem });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.updateInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    if (updates.currentStock !== undefined) {
      updates.lastRestocked = Date.now();
    }
    const updatedItem = await Inventory.findByIdAndUpdate(id, updates, { new: true });
    if (!updatedItem) return res.status(404).json({ status: "fail", message: "Item not found" });
    res.status(200).json({ status: "success", data: updatedItem });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.deleteInventoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedItem = await Inventory.findByIdAndDelete(id);
    if (!deletedItem) return res.status(404).json({ status: "fail", message: "Item not found" });
    res.status(200).json({ status: "success", message: "Item deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};
