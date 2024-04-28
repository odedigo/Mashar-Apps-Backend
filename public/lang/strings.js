/**
 * --------------------------
 * Treasure Hunt Application
 * --------------------------
 * 
 * @desc Strings generated in backend
 * 
 * Org: Mashar / Kfar-Sava
 * By: Oded Cnaan
 * Date: March 2024
 */
const strings = {
   js : {
      formEmpty : "יש למלא את גודל הוקטור והזווית",
      badVector : "זה לא הוקטור הנכון. חשבו שנית...",
      goodVector: "<p>מצאתם את הוקטור הנכון!</p>",
      vectorInfo: "`<p>שימו לב שזהו הוקטור ה ${success} ברשימה מתוך ${rdl.vecSize.length}</p>`",
      riddleLine: "`<p class='vector' style='color:${0}'> (${rdl.vecSize[num]}m, ${1}°)</p>`"
   },
   ok: {
      actionOK: "הפעולה בוצעה בהצלחה",
      gameSaved: "המשחק נשמר בהצלחה",
      gameCloned: "המשחק שוכפל בהצלחה",
      startGameOK: "התחלת המשחק הצליחה",
      stoptGameOK: "עצירת המשחק הצליחה",
      gameCreated: "המשחק נוצר בהצלחה",
      gameDeleteOK: "מחיקת המשחק הצליחה",
      userRegOK: "משתמש חדש נרשם בהצלחה",
      userDeleteOK: "משתמש נמחק",
      passUpdatedOK: "הסיסמה עודכנה בהצלחה",
      roleUpdateOK: "התפקיד עודכן בהצלחה",
      userUpdateOK: "עדכון משתמש הצליח",
      lsnListSavedOK: "רשימת השיעורים נשמרה בהצלחה"
   },
   err: {
      actionErr: "פעולה לא חוקית",
      actionFailed: "הפעולה נכשךה",
      nogame: "לא הצלחנו למצוא את נתוני המשחק",
      invalidAction:  "פעולה לא חוקית",
      gameNotFound: "המשחק לא נמצא",
      gameNotSaved: "המשחק לא נשמר",
      gameNotCloned: "המשחק לא שוכפל",
      noData: "חסרים נתונים",
      invalidData: "נתונים לא חוקיים",
      startGameErr: "התחלת המשחק נכשלה",
      stopGameErr: "עצירת המשחק נכשלה",
      gameNotCreated: "המשחק לא נשמר",
      gameNameTaken: "המשחק לא נוצר. ייתכן והשם כבר תפוס.",
      gameDeleteErr: "מחיקת המשחק נכשלה",
      branchNameInvalid: "שם או כינוי סניף לא חוקיים",
      branchAlreadyDefined: "סניף זה כבר מוגדר",
      cannotDeleteThisImage: "אי אפשר למחוק את התמונה הזאת",
      imageDeleteErr: "מחיקת התמונה נכשלה",
      branchCreateErr: "יצירת הסניף נכשלה",
      invalidUserPass: "שם משתמש או סיסמה לא תקינים",
      userNotFound: "תקלה במציאת המשתמש",
      formFillAll: "יש למלא את כל הפרטים בטופס",
      usernameNotEmail: "שם המשתמש אינו אימייל חוקי",
      emailNotEmail: "כתובת האימייל לא חוקית",
      usernameInvalid: "שם המשתמש אינו חוקי",
      passNotLong: "סיסמה צריכה להכיל לפחות 6 תווים",
      usernameTaken: "שם המשתמש כבר תפוס",
      userRegErr: "רישום המשתמש נכשל",
      usernameInvalid: "שם משתמש לא חוקי",
      failedUpdatingUser: "שגיאה בעדכון המשתמש",
      passUpdateErr: "עדכון הסיסמה נכשל",
      roleUpdateErr: "עדכון התפקיד נכשל",
      userUpdateErr: "עדכון משתמש נכשל",
      formNotFound: "הטופס לא נמצא"
   },
   gen: {
      yes: "כן",
      no: "לא",
      redTeam: "הקבוצה האדומה",
      blueTeam: "הקבוצה הכחולה",
      greenTeam: "הקבוצה הירוקה",
   },
   riddle: {
      firstLine: "השורה הראשונה",
      LastLine: "השורה האחרונה",
      sample1: "כיתבו את החידה",
      sample2: "המשך החידה"
   },
   title: {
      home: "מרכז אפליקציות",
      error: "שגיאה",
      admin: "אזור ניהול",
      login: "כניסה",
      studentArea: "מחפשים את המטמון - אזור התלמידים",
      teacherArea: "מחפשים את המטמון - אזור המורה",
      treasureAdmin: "מחפשים את המטמון - אזור ניהול",
      lessons: "שיעורי תגבור"
   }
}
export default strings