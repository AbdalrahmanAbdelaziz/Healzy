import { FeatureRoutingModel } from './services/feature-routing.model';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';

const parentRoute: string = "auth";

enum RouteKeys{
    login="login",
    signup="signup",
}

export const authenticationRoutingObject: FeatureRoutingModel<RouteKeys> = {
    parentRoute: parentRoute,
    routes: {
        [RouteKeys.login]: {
            routingObject: {
                path: RouteKeys.login,
                component: LoginComponent
            },
            label: {
                label_en: 'login',
                label_ar: 'تسجيل الدخول'
            },
            parentRoute: parentRoute
        },
        [RouteKeys.signup]: {
            routingObject: {
                path: RouteKeys.signup,
                component: RegisterComponent
            },
            label: {
                label_en: 'signup',
                label_ar: 'تسجيل مستخدم جديد'
            },
            parentRoute: parentRoute
        },
    }

};