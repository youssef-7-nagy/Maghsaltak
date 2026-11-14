const { Car } = require("../models/Car");

const normalizeText = (value) => String(value || "").trim();
const normalizePlate = (value) => normalizeText(value).toUpperCase();

const addCar = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, brand, model, year, color, plateNumber } = req.body || {};

    if (!type || !brand || !model || !year || !color || !plateNumber) {
      return res.status(400).json({ status: "fail", message: "All car fields are required" });
    }

    const cleanedPlate = normalizePlate(plateNumber);
    const duplicateCar = await Car.findOne({ user: userId, plateNumber: cleanedPlate });
    if (duplicateCar) {
      return res
        .status(409)
        .json({ status: "fail", message: "This plate number is already added to your garage" });
    }

    await Car.create({
      type: normalizeText(type),
      brand: normalizeText(brand),
      model: normalizeText(model),
      year: normalizeText(year),
      color: normalizeText(color),
      plateNumber: cleanedPlate,
      user: userId,
    });

    const cars = await Car.find({ user: userId }).sort({ createdAt: -1 });
    return res.status(201).json({ status: "success", data: { cars } });
  } catch (error) {
    console.error("Error adding car:", error);
    return res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

const getUserCars = async (req, res) => {
  try {
    const userId = req.user.id;
    const cars = await Car.find({ user: userId }).sort({ createdAt: -1 });
    return res.status(200).json({ status: "success", data: { cars } });
  } catch (error) {
    console.error("Error fetching cars:", error);
    return res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

const deleteCar = async (req, res) => {
  try {
    const userId = req.user.id;
    const carId = req.params.id;

    const deletedCar = await Car.findOneAndDelete({ _id: carId, user: userId });
    if (!deletedCar) {
      return res.status(404).json({ status: "fail", message: "Car not found or unauthorized" });
    }

    const cars = await Car.find({ user: userId }).sort({ createdAt: -1 });
    return res.status(200).json({ status: "success", data: { cars } });
  } catch (error) {
    console.error("Error deleting car:", error);
    return res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

const getAllCarsAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ status: "fail", message: "Forbidden" });
    }

    const cars = await Car.find({})
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    return res.status(200).json({ status: "success", data: { cars } });
  } catch (error) {
    console.error("Error fetching admin cars:", error);
    return res.status(500).json({ status: "error", message: "Internal server error" });
  }
};

module.exports = {
  addCar,
  getUserCars,
  deleteCar,
  getAllCarsAdmin,
};
