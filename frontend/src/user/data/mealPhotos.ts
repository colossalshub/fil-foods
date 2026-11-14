declare const require: (id: string) => number;

export const MEAL_PHOTOS: Record<string, number> = {
  1: require('../../../assets/images/meals/chicken-adobo.jpg'),
  2: require('../../../assets/images/meals/sinigang-hipon.jpg'),
  3: require('../../../assets/images/meals/tofu-stir-fry.jpg'),
  4: require('../../../assets/images/meals/salmon-teriyaki.jpg'),
  5: require('../../../assets/images/meals/oatmeal-fruits.jpg'),
  6: require('../../../assets/images/meals/egg-white-omelette.jpg'),
  7: require('../../../assets/images/meals/greek-chickpea-salad.jpg'),
  8: require('../../../assets/images/meals/grilled-chicken-wrap.jpg'),
  'sample-tinola': require('../../../assets/images/meals/chicken-tinola.png'),
  'sample-bangus': require('../../../assets/images/meals/grilled-bangus.jpg'),
  'sample-ampalaya': require('../../../assets/images/meals/ampalaya-stir-fry.jpg'),
  'sample-satay': require('../../../assets/images/meals/chicken-satay.jpg'),
};
