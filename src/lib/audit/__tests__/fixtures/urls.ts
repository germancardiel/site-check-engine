/** URLs used by the audit tests. They are never requested: fetch and DNS are mocked (D-TEST-04). */
export const SITE = 'https://example.com'
export const PAGE_URL = `${SITE}/`
export const HTTP_PAGE_URL = 'http://example.com/'
export const OTHER_SITE = 'https://other.example'
export const FTP_URL = 'ftp://example.com/file.txt'
export const PUBLIC_IP = '93.184.216.34'

export const ipUrl = (host: string): string => `http://${host}/`
export const INTERNAL_SITE = 'https://interno.example/'
