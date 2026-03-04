import axios from "axios"
import fs from "fs"
import path from "path"
import { execSync } from "child_process"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function getBaseUrl(type) {
  if (type === 'static') {
    return 'https://api.siputzx.my.id/api/m/brat'
  } else {
    return 'https://aqul-brat.hf.space/'
  }
}

async function handleBratStatic(m, { sock, text, command, reply }) {
  try {
    if (!text) return reply(`Contoh: .${command} halo dunia`)
    if (text.length > 250) return reply("❌ Karakter terbatas, max 250")

    const url = `${getBaseUrl('static')}?text=${encodeURIComponent(text)}&isAnimated=false&delay=500`

    reply("🎨 Membuat stiker brat...")

    const res = await axios.get(url, {
      responseType: "arraybuffer"
    })

    const buffer = Buffer.from(res.data)

    await sock.sendMessage(m.chat, {
      sticker: buffer
    }, { quoted: m })

  } catch (e) {
    console.error(e)
    reply("❌ Gagal buat stiker brat: " + e.message)
  }
}

async function handleBratVideo(m, { sock, text, command, reply }) {
  try {
    if (!text) return reply(`Contoh: ${command} hai`)
    if (text.length > 250) return reply("❌ Karakter terbatas, max 250!")

    const words = text.split(" ")
    const tempDir = path.join(process.cwd(), "cache")
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir)

    const framePaths = []

    reply("🎬 Membuat bratvid...")

    for (let i = 0; i < words.length; i++) {
      const currentText = words.slice(0, i + 1).join(" ")

      const res = await axios.get(
        `${getBaseUrl('video')}?text=${encodeURIComponent(currentText)}`,
        { responseType: "arraybuffer" }
      )

      const framePath = path.join(tempDir, `frame${i}.mp4`)
      fs.writeFileSync(framePath, res.data)
      framePaths.push(framePath)
    }

    const fileListPath = path.join(tempDir, "filelist.txt")
    let fileListContent = ""

    for (let i = 0; i < framePaths.length; i++) {
      fileListContent += `file '${framePaths[i]}'\n`
      fileListContent += `duration 0.5\n`
    }

    fileListContent += `file '${framePaths[framePaths.length - 1]}'\n`
    fileListContent += `duration 1.5\n`

    fs.writeFileSync(fileListPath, fileListContent)

    const outputVideoPath = path.join(tempDir, "output.mp4")

    execSync(
      `ffmpeg -y -f concat -safe 0 -i ${fileListPath} -vf "fps=30" -c:v libx264 -preset superfast -pix_fmt yuv420p ${outputVideoPath}`
    )

    await sock.sendImageAsSticker(m.chat, outputVideoPath, m, {
      packname: "BratVid",
      author: "Bot",
    })

    framePaths.forEach(f => fs.existsSync(f) && fs.unlinkSync(f))
    if (fs.existsSync(fileListPath)) fs.unlinkSync(fileListPath)
    if (fs.existsSync(outputVideoPath)) fs.unlinkSync(outputVideoPath)

  } catch (e) {
    console.error(e)
    reply("❌ Gagal buat bratvid: " + e.message)
  }
}

const handler = async (m, { sock, text, command, reply }) => {
  try {
    if (command === 'brat') {
      await handleBratStatic(m, { sock, text, command, reply })
    } else if (command === 'bratvid') {
      await handleBratVideo(m, { sock, text, command, reply })
    }
  } catch (e) {
    console.error(e)
    reply("❌ Terjadi kesalahan: " + e.message)
  }
}

handler.help = ["brat <text>", "bratvid <text>"]
handler.tags = ["sticker", "sticker"]
handler.command = ["brat", "bratvid"]

export default handler