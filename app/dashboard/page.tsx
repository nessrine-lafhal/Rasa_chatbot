"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Send, Info, LogOut, User, BarChart3, Settings, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { esgQuestionsFr, esgResponsesFr } from "../utils/esg-questions-fr"
import { ESGQuestionsExplorer } from "../components/esg-questions-explorer"
import { useRouter } from "next/navigation"

// Interface pour les messages
interface Message {
  role: "user" | "assistant"
  content: string
}

interface UserType {
  email: string
  firstName?: string
  lastName?: string
  company?: string
  role: string
}

// Composant principal du dashboard
export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Bonjour, je suis votre assistant ESG. Comment puis-je vous aider aujourd'hui?",
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté
    const storedUser = localStorage.getItem("user")
    if (!storedUser) {
      router.push("/auth/login")
      return
    }

    try {
      const parsedUser = JSON.parse(storedUser)
      setUser(parsedUser)
    } catch (error) {
      console.error("Erreur lors de la récupération des données utilisateur:", error)
      localStorage.removeItem("user")
      router.push("/auth/login")
    }
  }, [router])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleLogout = () => {
    localStorage.removeItem("user")
    router.push("/auth/login")
  }

  // Fonction pour envoyer un message à l'API Rasa
  const sendMessage = async () => {
    if (input.trim() === "") return

    // Ajouter le message de l'utilisateur
    const userMessage = { role: "user" as const, content: input }
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // Essayer d'abord d'appeler l'API Rasa
      const rasaResponse = await fetch("http://localhost:5005/webhooks/rest/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: "user",
          message: input,
        }),
      })

      let response = ""

      // Si l'appel à Rasa a réussi
      if (rasaResponse.ok) {
        const data = await rasaResponse.json()
        console.log("Réponse de Rasa:", data)

        if (data && data.length > 0 && data[0].text) {
          response = data[0].text
        } else {
          // Utiliser les réponses prédéfinies si Rasa ne renvoie pas de réponse
          response = getFallbackResponse(input)
        }
      } else {
        // Utiliser les réponses prédéfinies si l'appel à Rasa échoue
        console.error("Erreur lors de l'appel à Rasa:", rasaResponse.statusText)
        response = getFallbackResponse(input)
      }

      const assistantMessage = { role: "assistant" as const, content: response }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error)

      // Utiliser les réponses prédéfinies en cas d'erreur
      const fallbackResponse = getFallbackResponse(input)
      const assistantMessage = { role: "assistant" as const, content: fallbackResponse }
      setMessages((prev) => [...prev, assistantMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Fonction pour obtenir une réponse de secours à partir des données prédéfinies
  const getFallbackResponse = (question: string): string => {
    // Vérifier si la question existe dans notre base de réponses
    const knownResponses = esgResponsesFr as Record<string, string>

    // Recherche exacte
    if (knownResponses[question]) {
      return knownResponses[question]
    }

    // Recherche par mots-clés pour les émissions CO2
    if (
      question.toLowerCase().includes("émission") ||
      question.toLowerCase().includes("co2") ||
      question.toLowerCase().includes("carbone")
    ) {
      return "D'après nos données, les émissions de CO₂ au dernier trimestre étaient de 12,500 tonnes, soit une réduction de 8% par rapport au trimestre précédent."
    }

    // Recherche par mots-clés pour la parité
    if (
      question.toLowerCase().includes("parité") ||
      question.toLowerCase().includes("femme") ||
      question.toLowerCase().includes("genre")
    ) {
      return "Le taux de parité hommes-femmes global est de 42% de femmes. Par département: R&D: 38%, Marketing: 51%, Finance: 45%, Production: 32%, Service client: 58%, Équipe technique: 35%."
    }

    // Recherche par mots-clés pour la formation
    if (
      question.toLowerCase().includes("formation") ||
      question.toLowerCase().includes("rse") ||
      question.toLowerCase().includes("développement")
    ) {
      return "450 heures de formation RSE ont été suivies ce mois-ci. C'est une augmentation de 15% par rapport au mois précédent."
    }

    // Recherche par mots-clés pour les fournisseurs
    if (
      question.toLowerCase().includes("fournisseur") ||
      question.toLowerCase().includes("score") ||
      question.toLowerCase().includes("esg")
    ) {
      return "Les fournisseurs avec un score ESG faible cette année sont: Supplier A (score 42/100), Supplier B (score 38/100) et Supplier C (score 45/100). Nous avons mis en place des plans d'action avec ces fournisseurs pour améliorer leurs performances ESG."
    }

    // Réponse par défaut
    return "Je n'ai pas encore d'information précise sur cette question. Nos équipes ESG travaillent à enrichir ma base de connaissances. Pourriez-vous reformuler ou poser une question sur les émissions CO2, la parité, les formations RSE ou les scores ESG des fournisseurs?"
  }

  // Gérer l'envoi du formulaire
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage()
  }

  // Gérer la sélection d'une question prédéfinie
  const handleSelectQuestion = (question: string) => {
    setInput(question)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  }

  const getUserInitials = () => {
    if (!user) return "U"
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    }
    return user.email[0].toUpperCase()
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Chargement...</div>
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r hidden md:block">
        <div className="p-4 border-b">
          <div className="flex items-center space-x-2">
            <Avatar>
              <AvatarImage src="/placeholder.svg?height=32&width=32" alt={user.firstName || user.email} />
              <AvatarFallback>{getUserInitials()}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{user.firstName ? `${user.firstName} ${user.lastName}` : user.email}</p>
              <p className="text-xs text-muted-foreground">{user.company || "Entreprise"}</p>
            </div>
          </div>
        </div>
        <nav className="p-2">
          <ul className="space-y-1">
            <li>
              <Button variant="ghost" className="w-full justify-start">
                <User className="mr-2 h-4 w-4" />
                Profil
              </Button>
            </li>
            <li>
              <Button variant="ghost" className="w-full justify-start">
                <BarChart3 className="mr-2 h-4 w-4" />
                Tableau de bord
              </Button>
            </li>
            <li>
              <Button variant="ghost" className="w-full justify-start bg-gray-100">
                <HelpCircle className="mr-2 h-4 w-4" />
                Assistant ESG
              </Button>
            </li>
            <li>
              <Button variant="ghost" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
              </Button>
            </li>
          </ul>
        </nav>
        <div className="absolute bottom-4 w-64 px-2">
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Assistant ESG</h1>
            <div className="md:hidden">
              <Avatar className="cursor-pointer">
                <AvatarImage src="/placeholder.svg?height=32&width=32" alt={user.firstName || user.email} />
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 overflow-auto">
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="questions">Questions ESG</TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="space-y-4">
              <Card className="w-full">
                <CardContent className="p-4">
                  <div className="flex flex-col h-[60vh]">
                    <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-3">
                      {messages.map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg p-3 ${
                              message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}
                          >
                            {message.content}
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex justify-start">
                          <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                            <div className="flex space-x-2">
                              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                              <div
                                className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                                style={{ animationDelay: "0.2s" }}
                              ></div>
                              <div
                                className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                                style={{ animationDelay: "0.4s" }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleSubmit} className="flex gap-2">
                      <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Posez une question sur la performance ESG..."
                        className="flex-1"
                      />
                      <Button type="submit" disabled={isLoading}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="questions" className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                    <Info className="h-4 w-4" />
                    <p>Cliquez sur une question pour l'insérer dans le chat</p>
                  </div>

                  <ESGQuestionsExplorer questions={esgQuestionsFr} onSelectQuestion={handleSelectQuestion} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
