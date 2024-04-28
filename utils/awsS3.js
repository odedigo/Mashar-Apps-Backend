/**
 * --------------------------
 * Treasure Hunt Application
 * --------------------------
 * 
 * @desc AWS S3 handling
 * 
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 * 
 * EXAMPLES: 
 * 
 *  awsS3.listFolder("riddles/aco", function(err, keyList, options){
 *     console.log(err,keyList)
 *  }, null) 
 *
 *  awsS3.deleteFile("riddles/aco/empty.png", function(err, success) {
 *      console.log(err,success)
 *  })
 *
 *  awsS3.createFolder("riddles/aco", function(err, success){
 *      console.log(err,success)
 *  })
 * 
 */
import { S3Client } from '@aws-sdk/client-s3'
import { PutObjectCommand , CopyObjectCommand, DeleteObjectsCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

let AwsS3 = null
let bucketName = null

/**
 * Creates an S3 client or retrieves the existing one
 * @returns 
 */
export function getS3Client() {
    if (AwsS3 !== null)
        return AwsS3;

    AwsS3 = new S3Client({
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        },
        region: process.env.AWS_S3_BUCKET_REGION,
        endpoint: process.env.AWS_S3_BUCKET_REGION_RUL,
        forcePathStyle: true    
    })
    bucketName = process.env.AWS_S3_BUCKET_NAME
    return AwsS3    
}

/**
 * Creates a folder and copies empty.png into it
 * @param {*} folder - "riddle/aco"
 * @param {*} cb - callback
 */
export async function createFolder(folder, cb) {
    var command = new PutObjectCommand({
        Bucket: bucketName,
        Key: `${folder}/`
    });

    try {
        var response = await getS3Client().send(command)
        .then(res => {
          copyEmptyToFolder(folder, "empty.png", function(err, success) {
            cb(err, success)
          })  
        })
    } catch (err) {
        cb(err, false   )
        console.error(err);
    }
}

/**
 * deletes a folder and its contents
 * @param {*} folder 
 * @param {*} cb 
 * @param {*} options 
 */
export async function deleteFolder(folder, cb, options) {
    _listFolder(folder, function(err, keyList) {
        if (keyList.Objects.length === 0) {
            cb(err, 0, options)
            return
        }
        keyList.Objects = keyList.Objects.slice().reverse()
        deleteMultipleObjects(keyList, function (err, numDeleted) {
            cb(err, numDeleted, options)
        })
    })
      
}

/**
 * lists files within a folder
 * The last filename is the folder itself
 * @param {*} folder 
 * @param {*} cb 
 * @param {*} options 
 */
export async function listFolder(folder, cb, options) {
    _listFolder(folder, function(err, keyList) {
        if (keyList.Objects.length !== 0) 
            keyList.Objects = keyList.Objects.slice().reverse()
        cb(err, keyList, options)
    })
}

/**
 * Deletes a file from a folder
 * @param {*} file 
 * @param {*} cb 
 */
export async function deleteFile(file, cb) {
    const command = new DeleteObjectCommand({
           Bucket: process.env.AWS_S3_BUCKET_NAME,
           Key: file
         });
   
         try {
           const response = await getS3Client().send(command);
           cb(null, true)
         } catch (err) {
           console.error(err);
           cb(err, false)
         }
}

export async function copyEmptyToFolder(folder, targetName, cb) {
    try {
      // copy empty.png
      var command = new CopyObjectCommand({
          CopySource: `${bucketName}/empty.png`,
          Bucket: bucketName,
          Key: `${folder}/${targetName}`,
        });
        var response = await getS3Client().send(command);
        cb(null, true)
    } catch (err) {
        cb(err, false)
        console.error(err);
    }
}

/**
 *  deleting multiple files from a folder in one operation
 * @param {*} keyList 
 * @param {*} cb 
 */
export async function deleteMultipleObjects(keyList, cb) {
      const command = new DeleteObjectsCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Delete: keyList
      });
      try {
         const { Deleted } = await getS3Client().send(command);
         cb(null, Deleted.length)
       } catch (err) {
         console.error(err);
         cb(err, null)
       }
 }
 
 export async function keyExists(folder, key, cb) {
    _listFolder(folder, function(err, keyList) {
        const exists = keyList.Objects.filter( k => (k.Key.lastIndexOf(key) != -1) )
        cb(err, exists.length > 0)
    })
 } 
   
/************ INTERNAL ***************/

/**
 * INTERNAL - listing folder contents
 * @param {*} folder 
 * @param {*} cb 
 * @param {*} options 
 * @returns 
 */
async function _listFolder(folder, cb, options) {
    const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: folder + "/",
        MaxKeys: 100,
      });
 
      try {
        let isTruncated = true;
        let keyList = {"Objects": []};
    
        while (isTruncated) {
          const { Contents, IsTruncated, NextContinuationToken } = await getS3Client().send(command);
          if (Contents === undefined) {
            cb(null, keyList)
            return
          }
          const contentsList = Contents.map((c) => keyList.Objects.push({"Key":c.Key.replace("//","/")}));
          isTruncated = IsTruncated;
          command.input.ContinuationToken = NextContinuationToken;
        }
        cb(null, keyList)
      } catch (err) {
        console.error(err);
        cb(err, null)
      }
}

