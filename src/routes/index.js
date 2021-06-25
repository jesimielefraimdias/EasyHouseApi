const express = require("express");
const multer = require("multer");
const multerConfig = require("../app/middleware/multer");

const routes = express.Router();

const UserController = require("../app/controllers/UserController");
const AdministratorController = require("../app/controllers/AdministratorController");
const PropertyController = require("../app/controllers/PropertyController");
const AuthenticationController = require("../app/controllers/AuthenticationController");
const AuthenticatedOnly = require("../app/middleware/AuthenticatedOnly");
const ExpenseController = require("../app/controllers/ExpenseController");

//Login
routes.post("/login", AuthenticationController.login);
routes.get("/logout", AuthenticationController.logout);

routes.post("/forgotPassword", AuthenticationController.forgotPassword);
routes.get("/resetPassword/:token", AuthenticationController.resetPassword);
routes.get("/changeEmail/:token", AuthenticationController.changeEmail);

routes.post("/createUser", UserController.create);
routes.post("/emailExists", UserController.emailExists);
routes.post("/cpfExists", UserController.cpfExists);

routes.post("/createProperty",
    AuthenticatedOnly.userAccessLevel,
    multer(multerConfig).array('files', 10),
    PropertyController.create);

routes.post("/createExpense",
    AuthenticatedOnly.userAccessLevel,
    multer(multerConfig).array('files', 10),
    ExpenseController.create);
routes.get("/getExpense/:id", AuthenticatedOnly.userAccessLevel, ExpenseController.getExpense);
routes.get("/listExpenses/:property_id",
    AuthenticatedOnly.userAccessLevel,
    multer(multerConfig).array('files', 10),
    ExpenseController.list);
routes.get("/listExpenses2/:property_id",
    AuthenticatedOnly.userAccessLevel,
    multer(multerConfig).array('files', 10),
    ExpenseController.list);
routes.get("/getExpenses", AuthenticatedOnly.userAccessLevel, ExpenseController.getAllExpense);


routes.get("/listProperties", AuthenticatedOnly.userAccessLevel, PropertyController.list);
routes.get("/listProperties/:user_id", AuthenticatedOnly.userAccessLevel, PropertyController.listByUser);
routes.get("/listAllProperties", AuthenticatedOnly.userAccessLevel, PropertyController.listAll);
routes.get("/getProperty/:id", AuthenticatedOnly.userAccessLevel, PropertyController.getProperty);

routes.post("/createAdministratorLevel", AuthenticatedOnly.administratorAccessLevel, AdministratorController.create);

routes.get("/activateAccount/:token", AuthenticationController.activateAccount);
routes.post("/resendEmail", UserController.resendEmail);

routes.put("/updateProfile", AuthenticatedOnly.userAccessLevel, UserController.update);
routes.put("/updateAdministratorLevel", AuthenticatedOnly.administratorAccessLevel, AdministratorController.update);

routes.post("/getUser", AuthenticatedOnly.userAccessLevel, UserController.getUser);
routes.get("/getAnotherUser", AuthenticatedOnly.administratorAccessLevel, AdministratorController.getUser);
routes.get("/getUsers", AuthenticatedOnly.administratorAccessLevel, AdministratorController.getUsers);

routes.post("/isLoggedUserLevel", AuthenticatedOnly.userAccessLevel, UserController.isLogged);
routes.post("/isLoggedAdministratorLevel", AuthenticatedOnly.administratorAccessLevel, AdministratorController.logged);
routes.post("/isLoggedDashBoard", AuthenticatedOnly.administratorAccessLevel, AdministratorController.logged);

routes.get("/download/:file", PropertyController.download);

module.exports = routes;