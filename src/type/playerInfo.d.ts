type PlayerBasicInfo = { username: string, uuid: string }

type PlayerLiteInfo = PlayerBasicInfo & { macAddress: string }

type PlayerFullInfo = PlayerLiteInfo & { ip: string, packName: string }

type PlayerUpdateInfo = PlayerLiteInfo & { ip: string, packName?: string }

type PlayerGetKeyInfo = PlayerLiteInfo & { packName: string }

type PlayerCreateKeyInfo = PlayerFullInfo & { key: string }

