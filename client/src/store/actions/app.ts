import { ActionType } from '../action-types';
import { App } from '../../interfaces';

export interface GetAppsAction<T> {
  type:
    | ActionType.getApps
    | ActionType.getAppsSuccess
    ;
  payload: T;
}
export interface GetAppsErrorAction {
  type: ActionType.getAppsError;
  payload: string;
}

export interface PinAppAction {
  type: ActionType.pinApp;
  payload: App;
}

export interface AddAppAction {
  type: ActionType.addAppSuccess;
  payload: App;
}
export interface DeleteAppAction {
  type: ActionType.deleteApp;
  payload: number;
}

export interface UpdateAppAction {
  type: ActionType.updateApp;
  payload: App;
}

export interface ReorderAppsAction {
  type: ActionType.reorderApps;
  payload: App[];
}

export interface SortAppsAction {
  type: ActionType.sortApps;
  payload: string;
}

export interface SetEditAppAction {
  type: ActionType.setEditApp;
  payload: App | null;
}
