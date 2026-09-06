/**
 * 🌟 MAARİF YILDIZI 3 — GOOGLE E-TABLOLAR CANLI ÖĞRENCİ TAKİP SCRIPTI
 * 
 * BU KODU NASIL KULLANACAKSINIZ? (30 Saniyede Kurulum):
 * 1. Google Drive'ınızı açın (drive.google.com).
 * 2. Yeni bir "Google E-Tablo" (Google Sheets) oluşturun. İsim olarak örn: "3-A Maarif Sınav Takip" yazın.
 * 3. Üst menüden: "Uzantılar" (Extensions) -> "Apps Script" seçeneğine tıklayın.
 * 4. Açılan ekrandaki kodları silip yerine BU KODUN TAMAMINI yapıştırın.
 * 5. Sağ üstteki mavi "Dağıt" (Deploy) -> "Yeni Dağıtım" (New deployment) butonuna tıklayın.
 * 6. Sol taraftaki çark simgesinden "Web uygulaması" (Web app) seçin:
 *    - Açıklama: Maarif Takip
 *    - Farklı yürüt (Execute as): "Ben" (E-posta adresiniz)
 *    - Kimlerin erişimi var (Who has access): "Herkes" (Anyone) -> (Tabletin şifresiz veri yazabilmesi için)
 * 7. "Dağıt" butonuna basın ve çıkan "Web Uygulaması URL'sini" (Web App URL) kopyalayın.
 * 8. Kopyaladığınız linki Maarif Yıldızı uygulamasında üstteki 👨‍🏫 (Veli/Öğretmen) butonuna basıp yapıştırın.
 * 
 * TEBRİKLER! Artık sınıftaki herhangi bir çocuk sınavı bitirdiği an,
 * tablonuza canlı bir satır eklenecek ve telefonunuzdan görebileceksiniz!
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Tablo boşsa başlıkları otomatik oluştur
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Tarih / Saat",
        "Öğrenci Adı Soyadı",
        "Sınıf / Şube",
        "Okul No",
        "Faaliyet Türü",
        "Ders / Konu / Sınav",
        "Puan",
        "Doğru",
        "Yanlış",
        "Deneme #",
        "Toplam Yıldız"
      ]);
      
      // Başlıkları şık renklendir
      var headerRange = sheet.getRange(1, 1, 1, 11);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#1E1B4B");
      headerRange.setFontColor("#FFFFFF");
      headerRange.setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }
    
    var data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter || {};
    }
    
    var eventType = data.event || "Faaliyet";
    var activityName = data.exam_title || data.topic_title || data.action || "Giriş";
    var score = data.score !== undefined ? data.score : (data.quiz_score !== undefined ? data.quiz_score : "-");
    var correct = data.correct_count !== undefined ? data.correct_count : "-";
    var wrong = data.wrong_count !== undefined ? data.wrong_count : "-";
    var attempt = data.attempt_number !== undefined ? ("Deneme " + data.attempt_number) : "1. Deneme";
    
    sheet.appendRow([
      data.timestamp || new Date().toLocaleString("tr-TR"),
      data.student_name || "Öğrenci",
      data.student_class || "3-A",
      data.student_no || "-",
      eventType,
      activityName,
      score,
      correct,
      wrong,
      attempt,
      data.total_stars || 0
    ]);
    
    var lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 1, 1, 11).setHorizontalAlignment("center");
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", row: lastRow }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput("Maarif Yıldızı 3 Telemetri Webhook Aktif!")
    .setMimeType(ContentService.MimeType.TEXT);
}
