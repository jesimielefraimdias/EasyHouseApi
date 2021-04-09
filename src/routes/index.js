const express = require("express");
const multer = require("multer");
const multerConfig = require("../config/multer");

const path = require("path");
const fs = require("fs");
const routes = express.Router();

const UserController = require("../app/controllers/UserController");
const AdministratorController = require("../app/controllers/AdministratorController");
const AuthenticationController = require("../app/controllers/AuthenticationController");
const AuthenticatedOnly = require("../app/middleware/AuthenticatedOnly");

routes.post("/loginDashboard", AuthenticationController.loginDashboard);

routes.get("/logout", AuthenticationController.logout);

routes.post("/forgotPassword", AuthenticationController.forgotPassword);
routes.get("/resetPassword/:token", AuthenticationController.resetPassword);
routes.get("/changeEmail/:token", AuthenticationController.changeEmail);

routes.post("/createUser", UserController.create);
routes.post("/createAdministratorLevel", AuthenticatedOnly.administratorAccessLevel, AdministratorController.create);
routes.post("/createEvaluation", AuthenticatedOnly.userAccessLevel, UserController.createEvaluation);

routes.get("/activateAccount/:token", AuthenticationController.activateAccount);
routes.post("/resendEmail", UserController.resendEmail);

routes.put("/updateProfile", AuthenticatedOnly.userAccessLevel, UserController.update);
routes.put("/updateAdministratorLevel", AuthenticatedOnly.administratorAccessLevel, AdministratorController.update);

routes.post("/getUser", AuthenticatedOnly.userAccessLevel, UserController.getUser);
routes.get("/getAnotherUser", AuthenticatedOnly.administratorAccessLevel, AdministratorController.getUser);
routes.get("/getUsers", AuthenticatedOnly.operatorAccessLevel, AdministratorController.getUsers);

routes.post("/isLogged", AuthenticatedOnly.accessLevel, UserController.logged);
routes.post("/isLoggedUserLevel", AuthenticatedOnly.userAccessLevel, UserController.logged);
routes.post("/isLoggedAdministratorLevel", AuthenticatedOnly.administratorAccessLevel, AdministratorController.logged);
routes.post("/isLoggedDashBoard", AuthenticatedOnly.administratorAccessLevel, AdministratorController.logged);

module.exports = routes;