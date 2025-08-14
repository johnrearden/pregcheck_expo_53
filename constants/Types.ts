/**
 * Animal types enum for consistent usage throughout the app
 */
export enum AnimalType {
  Cow = 'C',
  Sheep = 'S',
  Goat = 'G',
}

/**
 * Standard gestation periods in days for different animal types
 */
export const GESTATION_PERIODS = {
  [AnimalType.Cow]: 283,
  [AnimalType.Sheep]: 150,
  [AnimalType.Goat]: 150,
};

/**
 * Time unit enum for consistent usage throughout the app
 */
export enum TimeUnit {
  Days = 'days',
  Weeks = 'weeks',
  Months = 'months',
}

/**
 * Conversion factors for time units to days
 */
export const TIME_UNIT_TO_DAYS = {
  [TimeUnit.Days]: 1,
  [TimeUnit.Weeks]: 7,
  [TimeUnit.Months]: 30,
};



