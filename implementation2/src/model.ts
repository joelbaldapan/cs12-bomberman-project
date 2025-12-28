import { Schema as S } from "effect";

// TODO: REMOVE COMMON_TYPES.TS and MOVE all to this file

export type Model = typeof Model.Type;
export type initModel = typeof initModel.Type;

export const Model = S.Struct({
});

export const initModel = S.Struct({
});