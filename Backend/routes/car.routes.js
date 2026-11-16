const express = require("express");
const router = express.Router();

const carController = require("../controllers/car.controller.js");
const { authMiddleWare } = require("../middlewares/auth.middleware.js");

router.use(authMiddleWare);

router.post("/", carController.addCar);
router.post("/add", carController.addCar);
router.get("/admin/all", carController.getAllCarsAdmin);
router.get("/", carController.getUserCars);
router.delete("/:id", carController.deleteCar);

module.exports = router;
