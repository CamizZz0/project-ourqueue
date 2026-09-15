import { sendError } from "../utils/response.js";

export const validate = (schemas) => (req, res, next) => {
  try {
    const valid = {};
    if (schemas.body) valid.body = schemas.body.parse(req.body ?? {});
    if (schemas.query) valid.query = schemas.query.parse(req.query ?? {});
    if (schemas.params) valid.params = schemas.params.parse(req.params ?? {});
    req.valid = { ...(req.valid || {}), ...valid };
    if (valid.body !== undefined) req.body = valid.body;
    if (valid.params !== undefined) Object.assign(req.params, valid.params);
    next();
  } catch (err) {
    const issues = err?.issues || [];
    const details = issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }));
    const message = details[0]?.message || "Data yang dikirim tidak valid.";
    return sendError(res, message, details, 400);
  }
};
