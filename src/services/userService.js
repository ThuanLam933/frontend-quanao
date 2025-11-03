import api from "./api";

export const login = (email, password) =>
    api.post("/login", { email, password }, {
    });



