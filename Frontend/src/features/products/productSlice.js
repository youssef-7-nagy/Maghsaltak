const vehicleTypes = [
	{ id: 'hatchback', label: 'Hatchback', priceMultiplier: 1, durationOffset: 0 },
	{ id: 'coupe', label: 'Coupe', priceMultiplier: 1.08, durationOffset: 4 },
	{ id: 'sedan', label: 'Sedan', priceMultiplier: 1, durationOffset: 0 },
	{ id: 'convertible', label: 'Convertible', priceMultiplier: 1.18, durationOffset: 6 },
	{ id: 'suv', label: 'SUV', priceMultiplier: 1.24, durationOffset: 10 },
];

const packageTemplates = [
	{
		id: 'basic',
		title: 'Basic Wash',
		basePrice: 15,
		baseDuration: 15,
		isPopular: false,
		features: ['Exterior wash', 'Cloth rubbing', 'Tire cleaning', 'Quick dry'],
	},
	{
		id: 'premium',
		title: 'Premium Wash',
		basePrice: 25,
		baseDuration: 30,
		isPopular: true,
		features: ['Interior & exterior', 'Vacuum cleaning', 'Pressure air blowing', 'Dashboard polish', 'Tire shine'],
	},
	{
		id: 'deluxe',
		title: 'Deluxe Wash',
		basePrice: 35,
		baseDuration: 60,
		isPopular: false,
		features: [
			'Complete interior detail',
			'Exterior wash & wax',
			'Engine bay cleaning',
			'Leather conditioning',
			'Dust coating',
		],
	},
];

const defaultVehicleId = 'sedan';

export const productActionTypes = {
	SET_VEHICLE_TYPE: 'products/setVehicleType',
	SELECT_PACKAGE: 'products/selectPackage',
	RESET_SELECTION: 'products/resetSelection',
};

export const initialProductState = {
	vehicleTypes,
	selectedVehicleId: defaultVehicleId,
	selectedPackageId: packageTemplates.find((item) => item.isPopular)?.id ?? packageTemplates[0].id,
};

const getVehicleById = (vehicleId) => {
	return vehicleTypes.find((item) => item.id === vehicleId) ?? vehicleTypes.find((item) => item.id === defaultVehicleId);
};

const buildPackagesForVehicle = (vehicle) => {
	return packageTemplates.map((washPackage) => ({
		...washPackage,
		price: Math.round(washPackage.basePrice * vehicle.priceMultiplier),
		duration: washPackage.baseDuration + vehicle.durationOffset,
		vehicleId: vehicle.id,
		vehicleLabel: vehicle.label,
	}));
};

export const setVehicleType = (vehicleId) => ({
	type: productActionTypes.SET_VEHICLE_TYPE,
	payload: vehicleId,
});

export const selectPackage = (packageId) => ({
	type: productActionTypes.SELECT_PACKAGE,
	payload: packageId,
});

export const resetProductSelection = () => ({
	type: productActionTypes.RESET_SELECTION,
});

export const productReducer = (state, action) => {
	switch (action.type) {
		case productActionTypes.SET_VEHICLE_TYPE: {
			const requestedVehicle = getVehicleById(action.payload);
			if (!requestedVehicle) {
				return state;
			}

			return {
				...state,
				selectedVehicleId: requestedVehicle.id,
			};
		}

		case productActionTypes.SELECT_PACKAGE: {
			const packageExists = packageTemplates.some((washPackage) => washPackage.id === action.payload);
			if (!packageExists) {
				return state;
			}

			return {
				...state,
				selectedPackageId: action.payload,
			};
		}

		case productActionTypes.RESET_SELECTION:
			return {
				...initialProductState,
			};

		default:
			return state;
	}
};

export const selectVehicleTypes = (state) => state.vehicleTypes;

export const selectSelectedVehicle = (state) => getVehicleById(state.selectedVehicleId);

export const selectPackagesForSelectedVehicle = (state) => {
	const selectedVehicle = selectSelectedVehicle(state);
	return buildPackagesForVehicle(selectedVehicle);
};

export const selectSelectedPackage = (state) => {
	const packages = selectPackagesForSelectedVehicle(state);
	return packages.find((washPackage) => washPackage.id === state.selectedPackageId) ?? packages[0];
};

export const createBookingPayload = ({ vehicle, washPackage }) => ({
	vehicleTypeId: vehicle.id,
	vehicleTypeLabel: vehicle.label,
	packageId: washPackage.id,
	packageTitle: washPackage.title,
	price: washPackage.price,
	duration: washPackage.duration,
	features: washPackage.features,
});

