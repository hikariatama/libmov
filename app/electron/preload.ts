import { contextBridge, ipcRenderer } from 'electron'
import { ipcChannels, type LibmovApi } from '../shared/ipc'

const api: LibmovApi = {
  bootstrap: () => ipcRenderer.invoke(ipcChannels.bootstrap),
  configureCatalog: (request) => ipcRenderer.invoke(ipcChannels.configureCatalog, request),
  browseCatalog: (request) => ipcRenderer.invoke(ipcChannels.browseCatalog, request),
  createList: (request) => ipcRenderer.invoke(ipcChannels.createList, request),
  platform: process.platform,
  getMediaDetail: (request) => ipcRenderer.invoke(ipcChannels.getMediaDetail, request),
  searchMedia: (request) => ipcRenderer.invoke(ipcChannels.searchMedia, request),
  setListMembership: (request) => ipcRenderer.invoke(ipcChannels.setListMembership, request),
  setWatchedByTvdbIds: (request) => ipcRenderer.invoke(ipcChannels.setWatchedByTvdbIds, request),
  setWatched: (request) => ipcRenderer.invoke(ipcChannels.setWatched, request),
}

contextBridge.exposeInMainWorld('libmov', api)
