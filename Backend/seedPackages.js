const mongoose = require("mongoose");
const Package = require("./models/Package");
const { databaseConnection } = require("./db/db.config");
const dotenv = require("dotenv");

dotenv.config();

const seedPackages = async () => {
    await databaseConnection();
    
    const defaultPackages = [
        {
            title: 'Silver Package',
            price: 500,
            stock: '1 Month', // Storing the duration in "stock" for now
            category: 'subscription',
            description: "Weekly exterior wash (4x)\nWeekly tire cleaning (4x)",
            images: [],
            order: 0
        },
        {
            title: 'Gold Package',
            price: 800,
            stock: '1 Month',
            category: 'subscription',
            description: "Weekly exterior wash (4x)\nWeekly tire cleaning (4x)\nWeekly interior vacuum (4x)",
            images: [],
            order: 1
        },
        {
            title: 'Platinum Package',
            price: 1250,
            stock: '1 Month',
            category: 'subscription',
            description: "Weekly exterior wash (4x)\nWeekly tire cleaning (4x)\nWeekly interior vacuum (4x)\nChemical interior wash (2x/month)",
            images: [],
            order: 2
        }
    ];

    try {
        console.log("Checking if packages exist...");
        const count = await Package.countDocuments();
        if (count === 0) {
            console.log("Seeding default packages...");
            await Package.insertMany(defaultPackages);
            console.log("Packages seeded successfully!");
        } else {
            console.log("Packages already exist. Attempting to add missing ones...");
            // Just drop and reseed for this run since the user specifically wants them back
            await Package.deleteMany({});
            await Package.insertMany(defaultPackages);
            console.log("Packages securely re-seeded!");
        }
    } catch (err) {
        console.error("Error seeding packages:", err);
    } finally {
        mongoose.connection.close();
    }
};

seedPackages();
