import { Route } from "@angular/router";

// Define a type for each entry in the object
export interface RouteInfoModel {
    routingObject: Route;
    label: {label_en: string, label_ar: string};
    parentRoute: string;
}
