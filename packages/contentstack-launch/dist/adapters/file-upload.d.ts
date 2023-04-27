/// <reference types="node" />
import { PathLike } from "fs";
import BaseClass from "./base-class";
import { AdapterConstructorInputs } from "../types";
export default class FileUpload extends BaseClass {
    private signedUploadUrlData;
    constructor(options: AdapterConstructorInputs);
    /**
     * @method run
     *
     * @return {*}  {Promise<void>}
     * @memberof FileUpload
     */
    run(): Promise<void>;
    /**
     * @method createNewProject - Create new launch project
     *
     * @return {*}  {Promise<void>}
     * @memberof FileUpload
     */
    createNewProject(): Promise<void>;
    /**
     * @method prepareForNewProjectCreation - prepare necessary data for new project creation
     *
     * @return {*}  {Promise<void>}
     * @memberof FileUpload
     */
    prepareForNewProjectCreation(): Promise<void>;
    /**
     * @method fileValidation - validate the working directory
     *
     * @memberof FileUpload
     */
    fileValidation(): void;
    /**
     * @method archive - Archive the files and directory to be uploaded for launch project
     *
     * @return {*}
     * @memberof FileUpload
     */
    archive(): Promise<{
        zipName: string;
        zipPath: string;
        projectName: string;
    }>;
    /**
     * @method createSignedUploadUrl - create pre signed url for file upload
     *
     * @return {*}  {Promise<void>}
     * @memberof FileUpload
     */
    createSignedUploadUrl(): Promise<void>;
    /**
     * @method uploadFile - Upload file in to s3 bucket
     *
     * @param {string} fileName
     * @param {PathLike} filePath
     * @return {*}  {Promise<void>}
     * @memberof FileUpload
     */
    uploadFile(fileName: string, filePath: PathLike): Promise<void>;
}
