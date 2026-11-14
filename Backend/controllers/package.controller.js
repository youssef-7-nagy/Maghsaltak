const Package = require("../models/Package");

// Get all products/packages (Sorted by "order" then "createdAt")
exports.getAllPackages = async (req, res) => {
  try {
    const packages = await Package.find({}).sort({ order: 1, createdAt: -1 });
    res.status(200).json({
      status: "success",
      data: packages,
    });
  } catch (error) {
    res.status(500).json({ status: "fail", message: "Failed to fetch packages" });
  }
};


exports.createPackage = async (req, res) => {
  try {
    const { title, description, price, stock, category } = req.body;
    
    
    const images = req.files ? req.files.map(file => `uploads/${file.filename}`) : [];

    const newPackage = await Package.create({
      title,
      description,
      price: Number(price),
      stock: stock || "Unlimited",
      category,
      images,
    });

    res.status(201).json({
      status: "success",
      data: newPackage,
    });
  } catch (error) {
    console.error("Create Package Error:", error.message);
    res.status(500).json({ status: "fail", message: "Failed to create package" });
  }
};

// Update an existing package
exports.updatePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, stock, category } = req.body;

    const updatedData = {
      title,
      description,
      price: Number(price),
      stock,
      category,
    };

    // If new images were uploaded, we override or append (depending on frontend logic).
    // The Admin Panel appears to just re-submit FormData images on Edit.
    if (req.files && req.files.length > 0) {
       updatedData.images = req.files.map(file => `uploads/${file.filename}`);
    }

    const updatedPackage = await Package.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!updatedPackage) {
      return res.status(404).json({ status: "fail", message: "Package not found" });
    }

    res.status(200).json({
      status: "success",
      data: updatedPackage,
    });
  } catch (error) {
    console.error("Update Package Error:", error.message);
    res.status(500).json({ status: "fail", message: "Failed to update package" });
  }
};

// Delete a package
exports.deletePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPackage = await Package.findByIdAndDelete(id);

    if (!deletedPackage) {
      return res.status(404).json({ status: "fail", message: "Package not found" });
    }

    res.status(200).json({ status: "success", message: "Package deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: "fail", message: "Failed to delete package" });
  }
};

// Reorder packages (drag & drop)
exports.reorderPackages = async (req, res) => {
  try {
    const { items } = req.body; // Expects [{ id: "...", order: 0 }, ...]
    
    // Process all updates concurrently
    const updates = items.map(item => 
      Package.findByIdAndUpdate(item.id, { order: item.order })
    );

    await Promise.all(updates);

    res.status(200).json({ status: "success", message: "Order updated successfully" });
  } catch (error) {
    res.status(500).json({ status: "fail", message: "Failed to reorder packages" });
  }
};
