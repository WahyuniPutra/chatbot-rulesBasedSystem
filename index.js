const qrcode = require("qrcode-terminal");
const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");
const https = require("https");
const { JSDOM } = require("jsdom");
const { getSystemErrorMap } = require("util");
const { OpenAI } = require("openai");
const { url } = require("inspector");
const Tesseract = require("tesseract.js");
const fetch = require("node-fetch");
const {
  Client,
  LegacySessionAuth,
  LocalAuth,
  MessageMedia,
} = require("whatsapp-web.js");

const OPENAI_API_KEY = "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";

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

const client = new Client({
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2410.1.html',
    },
  authStrategy: new LocalAuth({
  clientId: "client-one" //Un identificador(Sugiero que no lo modifiques)
  })
  })

function readAndSearchCSV(directory, filename, searchField, searchValue) {
  return new Promise((resolve, reject) => {
    let results = [];
    fs.createReadStream(path.join(directory, filename))
      .pipe(csv())
      .on("data", (row) => {
        if (row[searchField] && row[searchField].includes(searchValue)) {
          results.push(row);
        }
      })
      .on("end", () => {
        resolve(results);
      })
      .on("error", reject);
  });
}

async function scrapeJournal(keyword) {
  const url = "https://e-journal.upr.ac.id/index.php/JTI/issue/archive";
  const archivePage = await fetchPage(url);
  const archiveDom = new JSDOM(archivePage);
  const archiveLinks = Array.from(
    archiveDom.window.document.querySelectorAll(".obj_issue_summary a")
  ).map((a) => a.href);

  const results = new Set();

  // Map each link to a promise that fetches the page and extracts the articles
  const promises = archiveLinks.map(async (link) => {
    const page = await fetchPage(link);
    const dom = new JSDOM(page);
    const articles = dom.window.document.querySelectorAll(
      ".obj_article_summary"
    );

    articles.forEach((article) => {
      const title = article.querySelector(".title").textContent;
      const articleLink = article.querySelector(".title a").href;

      // Only add the article to the results if the title contains the keyword
      if (keyword && title.toUpperCase().includes(keyword.toUpperCase())) {
        // Create a unique key for each article
        const key = `${title}|${articleLink}`;

        results.add(key);
      }
    });
  });

  // Wait for all promises to complete
  await Promise.all(promises);

  // Convert the results back into the original format
  return Array.from(results).map((result) => {
    const [title, link] = result.split("|");
    return { title, link };
  });
}

async function fetchPage(url) {
  const response = await fetch(url);
  const body = await response.text();
  return body;
}

client.initialize();
// Save session values to the file upon successful auth
client.on("authenticated", (session) => {
  console.log(session);
});


client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Bot is ready!");
});

client.on("message", (message) => {
  if (message.body === "!ping") {
    message.reply("pong");
  }
});

client.on("message", (message) => {
  if (message.body === "/start") {
    message.reply(
      "Selamat datang di WhatsApp Bot Jurusan Teknik Informatika UPR.\nSilahkan gunakan command berikut:\n- /jadwalkuliah\n- /askti\n- /jurnal\n- /askgpt\n- /askgambar\n- /help\n\nSalam Teknik!"
    );
  }
});

client.on("message", async (message) => {
  if (message.body === "/askti") {
    message.reply(
      "Silahkan gunakan command untuk mengakses\n- */dosen* (contoh: /dosen Ressa)\n- */ruangan* (contoh: /ruangan FT-9)\n- */tentang* "
    );
  } else if (message.body.startsWith("/dosen")) {
    // Extract the search value from the message
    let searchValue = message.body.slice("/dosen".length).trim();

    // Check if the search value is empty
    if (!searchValue) {
      message.reply(
        "Format pesan salah. Silahkan gunakan format: */dosen* Nama Dosen \n\n Daftar Nama Dosen: \n 1.	Ariesta Lestari S.Kom. M.Cs. Ph.D. \n 2.	Drs. Jadiaman Parhusip M. Kom. \n 3.	Nahumi Nugrahaningsih Ph.D. \n 4.	Septian Geges S.Kom. M.Kom. \n 5.	Efrans Christian S.T. M.T. \n 6.	Novera Kristianti S.T. M.T. \n 7.	Felicia Sylviana S.T. M.M. \n 8.	Ressa Priskila S.T. M.T. \n 9.	Abertun Sagit Sahay S.T. M.Eng. \n 10.	Putu Bagus Adidyana Anugrah Putra S.T. M.Kom. \n 11.	Viktor Handrianus Pranatawijaya S.T. M.T. \n 12.	Ade Chandra Saputra S.Kom. M.Cs. \n 13.	Nova Noor Kamala Sari S.T. M.Kom. \n 14.	 Licantik S.Kom. M.Kom. \n 15.	Dody Ariyantho Kusma Wijaya S.HUT. M.SI. \n 16.	Agus Sehatman Saragih S.T. M.Eng. \n 17.	Widiatry S.T. M.T. \n 18.	Deddy Ronaldo S.T. M.T. \n 19.	Rony Teguh S.Kom. M.T. Ph.D. \n 20.	DR. Misnawati S.Pd. M.Pd \n 21.	Jumadi M.Pd. \n 22.	Dr. Syamhudian Noor S.H.I. M.Ag \n 23.	Nuraliyah S.Pd.I. M.Pd. \n 24.	Ester Sonya Ulfarita Lapalu M.Si. \n 25.	Dr. Yosep Dudi M.Si. \n 26.	Dr. Dhanu Pitoyo M.Si. \n 27.	Ida Bagus Suryanatha S.Sos. MA. "
      );
      return;
    }

    // Read and search the CSV file
    const results = await readAndSearchCSV(
      "./",
      "data/jadwal new.csv",
      "Dosen",
      searchValue
    );

    // Filter the results to only include those where the Dosen's name includes the search value
    const filteredResults = results.filter((result) =>
      result.Dosen.includes(searchValue)
    );

    // Check if there are any results
    if (filteredResults.length === 0) {
      message.reply("Maaf, tidak ada dosen dengan nama tersebut.");
      return;
    }

    // Group the filtered results by Dosen, Nip, No Hp, and Email
    const groupedResults = filteredResults.reduce((grouped, result) => {
      const key = `${result.Dosen}|${result.Nip}|${result["No Hp"]}|${result.Email}`;

      if (!grouped[key]) {
        grouped[key] = [];
      }

      grouped[key].push(result);

      return grouped;
    }, {});

    // Format the grouped results
    const formattedResults = Object.entries(groupedResults).map(
      ([key, classes]) => {
        const [Dosen, Nip, NoHp, Email] = key.split("|");

        const classesText = classes
          .map(
            (result) =>
              `\n\nHari: ${result.Hari}\nWaktu: ${result.Waktu}\nMata Kuliah: ${result["Mata Kuliah"]}\nKode Mata Kuliah: ${result["Kode Mata Kuliah"]}\nSks: ${result.Sks}\nSemester: ${result.Semester}`
          )
          .join("\n");

        return `Dosen: ${Dosen}\nNip: ${Nip}\nNo Hp: ${NoHp}\nEmail: ${Email}${classesText}`;
      }
    );

    message.reply(formattedResults.join("\n\n"));
    console.log(formattedResults);
  } else if (message.body.startsWith("/ruangan")) {
    let searchValue = message.body.slice("/ruangan".length).trim();

    if (!searchValue) {
      message.reply(
        "Format pesan salah. Silahkan gunakan format: */ruangan* Nama Ruangan \n\n Daftar Ruangan: \n 1. FT-5 \n 2. FT-6 \n 3. FT-7 \n 4. FT-8 \n 4. FT-9 \n 5. Ruang Dosen \n 6. Labotarium \n 7. Ruang Ujian 1 \n 8. Ruang Ujian 2 \n 9. Auditorium \n 10. Admin Prodi \n 11. Perpustakaan \n 12. Ruang Ketua Jurusan"
      );
      return;
    }

    if (searchValue === "FT-9") {
      client.sendMessage(
        message.from,
        "Ruang kelas FT-9 di Gedung A berlokasi di sebelah kanan dan agak belakang, jika dilihat dari arah Jalan Hendrik Timang. Ruang ini berseberangan dengan laboratorium Teknik Informatika (TI) Algoritma dan Pemrograman 1 & 2."
      );
      let image = MessageMedia.fromFilePath(".\\ruang\\FT-9.jpeg");
      client.sendMessage(message.from, image);
    } else if (searchValue === "FT-5") {
      client.sendMessage(
        message.from,
        "Ruang kelas FT-5 di Gedung C terletak di bagian paling depan, jika dilihat dari perspektif Jalan Hendrik Timang. Ruang kelas ini bersebelahan dengan tangga menuju lantai 2 dan juga berdekatan dengan ruang kelas FT-6."
      );
      let image = MessageMedia.fromFilePath(".\\ruang\\FT-5.jpeg");
      client.sendMessage(message.from, image);
    } else if (searchValue === "FT-6") {
      client.sendMessage(
        message.from,
        "Ruang kelas FT-6 di Gedung C terletak di bagian tengah, jika dilihat dari perspektif Jalan Hendrik Timang. Ruang kelas ini bersebelahan dengan ruang kelas FT-5 dan juga ruang kelas FT-7."
      );
      let image = MessageMedia.fromFilePath(".\\ruang\\FT-6.jpeg");
      client.sendMessage(message.from, image);
    } else if (searchValue === "FT-7") {
      client.sendMessage(
        message.from,
        "Ruang kelas FT-7 di Gedung C terletak di ujung bagian, jika dilihat dari perspektif Jalan Hendrik Timang. Ruang kelas ini bersebelahan dengan tangga menuju lantai 2 dan juga berdekatan dengan ruang kelas FT-6."
      );
      let image = MessageMedia.fromFilePath(".\\ruang\\FT-7.jpeg");
      client.sendMessage(message.from, image);
    } else if (searchValue === "FT-8") {
      client.sendMessage(
        message.from,
        "Ruang kelas FT-8 di Gedung C terletak di bagian depan, jika dilihat dari perspektif Jalan Hendrik Timang. Ruang kelas ini bersebelahan dengan tangga menuju lantai 1 dan juga berdekatan dengan ruang auditorium."
      );
      let image = MessageMedia.fromFilePath(".\\ruang\\FT-8.jpeg");
      client.sendMessage(message.from, image);
    } else if (searchValue === "Ruang Dosen") {
      client.sendMessage(
        message.from,
        "Ruang Dosen di Gedung A terletak di sebelah kanan, jika dilihat dari perspektif Jalan Hendrik Timang, dalam lingkup jurusan tersebut."
      );
      let image = MessageMedia.fromFilePath(".\\ruang\\dosen.jpeg");
      client.sendMessage(message.from, image);
    } else if (searchValue === "Laboratorium") {
      client.sendMessage(
        message.from,
        "Laboratorium Teknik Informatika (TI) Algoritma dan Pemrograman 1 & 2 di Gedung A terletak di sebelah kiri dan agak belakang, bila dilihat dari arah Jalan Hendrik Timang. Ruang ini berseberangan dengan ruang kelas FT-9."
      );
      let image = MessageMedia.fromFilePath(".\\ruang\\lab.jpeg");
      client.sendMessage(message.from, image);
    } else if (searchValue === "Ruang Ujian 1") {
      client.sendMessage(
        message.from,
        "Ruang Ujian 1 di Gedung A terletak di sebelah kanan, jika dilihat dari perspektif Jalan Hendrik Timang. Ruang ini berseberangan dengan ruang Ketua Jurusan."
      );
      let image = MessageMedia.fromFilePath(".\\ruang\\ujian1.jpeg");
      client.sendMessage(message.from, image);
    } else if (searchValue === "Ruang Ujian 2") {
      client.sendMessage(
        message.from,
        "Ruang Ujian 2 di Gedung A terletak di sebelah kiri, jika dilihat dari perspektif Jalan Hendrik Timang, dalam lingkup jurusan tersebut."
      );
      let image = MessageMedia.fromFilePath(".\\ruang\\ujian2.jpeg");
      client.sendMessage(message.from, image);
    } else if (searchValue === "Auditorium") {
      client.sendMessage(
        message.from,
        "Ruang auditorium di Gedung C terletak di ujung, jika dilihat dari perspektif Jalan Hendrik Timang. Ruang ini bersebelahan dengan tangga menuju lantai 1 dan juga berdekatan dengan ruang kelas FT-8."
      );
      let image = MessageMedia.fromFilePath(".\\ruang\\audit.jpeg");
      client.sendMessage(message.from, image);
    } else if (searchValue === "Admin Prodi") {
      client.sendMessage(
        message.from,
        "Ruang Admin dan Sekretaris Jurusan di Gedung A terletak di sebelah kiri, bila dilihat dari perspektif Jalan Hendrik Timang. Ruang ini berseberangan dengan Perpustakaan Teknik Informatika"
      );
      let image = MessageMedia.fromFilePath(".\\ruang\\admin.jpeg");
      client.sendMessage(message.from, image);
    } else if (searchValue === "Perpustakaan") {
      client.sendMessage(
        message.from,
        "Perpustakaan Teknik Informatika di Gedung A terletak di sebelah kiri, jika dilihat dari perspektif Jalan Hendrik Timang. Perpustakaan ini berseberangan dengan ruang Admin dan Sekretaris Jurusan."
      );
      let image = MessageMedia.fromFilePath(".\\ruang\\perpus.jpeg");
      client.sendMessage(message.from, image);
    } else if (searchValue === "Ruang Ketua Jurusan") {
      client.sendMessage(
        message.from,
        "Ruang Ketua Jurusan di Gedung A terletak di sebelah kanan, jika dilihat dari perspektif Jalan Hendrik Timang. Ruang ini berseberangan dengan ruang Ujian 1."
      );
      let image = MessageMedia.fromFilePath(".\\ruang\\ketua.jpeg");
      client.sendMessage(message.from, image);
    } else {
      message.reply("Maaf, tidak ada ruangan dengan nama tersebut.");
    }
  } else if (message.body.startsWith("/tentang")) {
    message.reply(
      "Berdasarkan SK Rektor Unpar No. 294/J.24/KP/2004, tanggal 20 Juli 2004 di buka Program Studi baru di lingkungan Fakultas Teknik yaitu Program Studi Teknik Informatika. Selanjutnya dengan dikeluarkannya SK Dirjen Dikti No. 4889/D/T/2006 tanggal 21 Desember 2006 maka disetujui program baru ini dengan nama Jurusan/Program Studi Teknik Informatika. \n\n Visi Jurusan Teknik Informatika : \n\n 'Menjadi Jurusan Teknik Informatika yang terkemuka dan terpercaya di tingkat nasional untuk menghasilkan Sumber Daya Manusia (SDM) yang profesional dalam penerapan Ilmu Pengetahuan dan Teknologi (IPTEK) di bidang Informatika pada tahun 2075' \n\n Misi Jurusan Teknik Informatika : \n\n1. Menyelenggarakan pendidikan dan pengajaran di bidang Teknik Informatika yang berorientasi pada peningkatan kualitas Sumber Daya Manusia (SDM). \n2. Mengembangkan kecakapan, kepemimpinan dan komunikasi dalam bidang Teknik Informatika. \n3. Menyelenggarakan penelitian yang inovatif dan aplikatif di bidang Teknik Informatika \n4. Melaksanakan pengabdian pada masyarakat yang mendukung pembangunan daerah dan nasional. \n\nJurusan ini memiliki beberapa program studi, di antaranya adalah: \n\n1. Rekayasa Perangkat Keras \n2. Sistem Operasi \n3. Rekayasa Perangkat Lunak \n4. Pemrograman Visual \n5. Pemrograman Web \n"
    );
  }
});

client.on("message", async (message) => {
  if (message.body === "/jadwalkuliah") {
    message.reply(
      "Silahkan bertanya kepada bot. dengan cara : */jadwal* Senin atau */jadwal* Kalkulus I"
    );
  } else if (message.body.startsWith("/jadwal")) {
    // Extract the search value from the message
    let searchValue = message.body.slice("/jadwal".length).trim();

    // Check if the search value is empty
    if (!searchValue) {
      message.reply(
        "Format pesan salah. Silahkan gunakan huruf kapital contoh : */jadwal* Senin atau */jadwal* Kalkulus I"
      );
      return;
    }

    // Read and search the CSV file by day
    let results = await readAndSearchCSV(
      "./",
      "data/jadwal.csv",
      "Hari",
      searchValue
    );

    // If no results, try to search by subject
    if (results.length === 0) {
      results = await readAndSearchCSV(
        "./",
        "data/jadwal.csv",
        "Mata Kuliah",
        searchValue
      );
    }

    // Check if there are any results
    if (results.length === 0) {
      message.reply(
        "Maaf, tidak ada jadwal untuk hari atau mata kuliah yang Anda cari."
      );
      return;
    }

    // Reply with the results
    message.reply(
      results
        .map(
          (result) =>
            `Hari: ${result.Hari}\nWaktu: ${result.Waktu}\nMata Kuliah: ${result["Mata Kuliah"]}\nKode Mata Kuliah: ${result["Kode Mata Kuliah"]}\nSemester: ${result.Semester}\nSks: ${result.Sks}\nDosen: ${result.Dosen}`
        )
        .join("\n\n")
    );
  }
});

client.on("message", (message) => {
  if (message.body === "/help") {
    message.reply(
      "Cara Penggunaan Bot Jurusan Teknik Informatika UPR: \n\n- */start* Bertujuan untuk memulai percakapan dan bot menyiapkan beberapa menu \n- */jadwalperkuliahan* Bertujuan untuk bertanya seputar jadwal perkuliahan. Contoh penggunaan: /jadwal Senin atau /jadwal Statistika \n- */askti* Bertujuan untuk bertanya seputar informasi yang ada di Teknik Informatika seperti dosen, ruangan dan tentang Teknik Informatika \n- */jurnal* Bertujuan untuk mencari judul jurnal yang ada di Jurnal Teknologi Informasi (JTI): https://e-journal.upr.ac.id/index.php/JTI. Contoh penggunaan: /jurnal neural network (*Kemungkinan proses selama 3-5 menit)\n- */askgpt* Bertujuan untuk penggunaan ChatGPT. Contoh penggunaan: /askgpt buatkan HTML sederhana \n- */askgambar* Bertujuan untuk membaca teks dari sebuah gambar. *kirimkan sebuah gambar /askgambar jelaskan teks tersebut \n- */help* Bertujuan untuk memberikan informasi cara penggunaan bot ini \n- */author* Bertujuan untuk menginformasikan pembuat bot ini"
    );
  } else if (message.body === "/author") {
    message.reply(
      "Bot ini dibuat untuk memenuhi tugas Kecerdasan Buatan. Bot ini dibuat oleh:\n- Ferry Saputra (223010503025)\n- Rifky Mustaqim H. (223010503028)\n- Wahyuni Putra (223010503020)\n\n2024"
    );
  }
});

client.on("message", async (message) => {
  const command = message.body.split(" ")[0];
  const keyword = message.body.split(" ").slice(1).join(" ");

  if (command === "/jurnal" && keyword) {
    const articles = await scrapeJournal(keyword);

    // Check if there are any articles
    if (articles.length === 0) {
      message.reply(
        "Maaf, tidak ada jurnal yang ditemukan dengan kata kunci tersebut."
      );
      return;
    }

    let replyMessage = "";
    articles.forEach((article, index) => {
      replyMessage += `Title: ${article.title}\nLink: ${article.link}\n\n`;
    });
    message.reply(replyMessage);
  }
});

client.on("message", async (message) => {
  if (message.body.startsWith("/askgpt")) {
    // Ekstrak input pengguna setelah "/askgpt"
    let text = message.body.slice("/askgpt".length).trim();

    // Jika input pengguna kosong, beri respons default
    if (!text) {
      message.reply(
        "Selamat datang di hari baru, cintaku. Sebelum kita terlalu sibuk, ceritakan padaku bagaimana perasaanmu hari ini. Aku ingin tahu apa yang kamu pikirkan."
      );
      // message.reply("Halo! Bagaimana saya bisa membantu Anda hari ini?");
      return;
    }

    // Melakukan permintaan ke model OpenAI GPT-3.5 Turbo untuk menghasilkan kelengkapan
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: text }],
    });

    // Mengelola respon model OpenAI GPT-3.5 Turbo
    if (response.error) {
      message.reply(`Error: ${response.error.message}`);
    } else if (response.choices && response.choices.length > 0) {
      var responseText =
        response.choices[0].message.content || "Tidak ada jawaban";
      message.reply(responseText);
    }
  }
});

client.on("message", async (message) => {
  const command = "/askgambar";
  if (message.hasMedia && message.body.toLowerCase().startsWith(command)) {
    const keyword = message.body.slice(command.length).trim();

    if (keyword.length > 0) {
      const media = await message.downloadMedia();

      Tesseract.recognize(
        `data:${media.mimetype};base64,${media.data.toString("base64")}`,
        "eng",
        { logger: (m) => console.log(m) }
      ).then(async ({ data: { text } }) => {
        console.log(text);
        const combinedMessage = `${text} ${keyword}`;
        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: combinedMessage }],
        });

        if (response.error) {
          message.reply(`Error: ${response.error.message}`);
        } else if (response.choices && response.choices.length > 0) {
          var responseText =
            response.choices[0].message.content || "Sem resposta";
          message.reply(responseText);
        }
      });
    }
  }
});

