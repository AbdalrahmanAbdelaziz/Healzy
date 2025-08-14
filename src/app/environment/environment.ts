import { BASE_URL } from "../shared/constants/urls";
import { baseEnvironment } from "./base-environment";

export const environment = {
    ...baseEnvironment,
    production: false,
    apiUrl: BASE_URL, // base url for APIs
    logging: true, // allow logging
    featureFlag: true, // run experimental features
};
