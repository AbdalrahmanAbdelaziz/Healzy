import { RouteInfoModel } from "../shared/models/route-info.model";

export interface FeatureRoutingModel<Routes_Names extends string> {
    parentRoute: string;
    routes: {
        [key in Routes_Names]: RouteInfoModel;
    };
}