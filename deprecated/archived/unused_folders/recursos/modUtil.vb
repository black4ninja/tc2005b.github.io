Option Explicit On

Imports System.Data
Imports System.Data.OleDb
Imports ZedGraph

Module modUtil

    Private connection As OleDbConnection

    '---------------------------------------------------------------------------------------------------------'
    '  Despliega un MessageBox de error que muestra el mensaje pasado como parámetro                          '
    '                                                                                                         '
    '  @param err  El error a desplegar                                                                       '
    '---------------------------------------------------------------------------------------------------------'
    Sub msgError(ByVal err As String)
        MessageBox.Show(err, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error, _
                        MessageBoxDefaultButton.Button1, 0, False)
    End Sub

    '---------------------------------------------------------------------------------------------------------'
    '  Ejecuta el comando de DML pasado como parámetro                                                        '                                                                        '
    '                                                                                                         '
    '  @param  dml El comando que se quiere ejecutar                                                          '
    '  @return  Verdadero si el comando se ejecutó de manera correcta, falso en caso contrario                '
    '---------------------------------------------------------------------------------------------------------'
    Function execute(ByVal dml As String) As Boolean
        Try
            Dim command As New OleDbCommand(dml, connection)
            connection.Open()
            command.ExecuteNonQuery()
            connection.Close()
            Return True
        Catch OleDbex As OleDbException
            Dim err As String
            err = "Error de base de datos al ejecutar el query" & vbCrLf & _
                  OleDbex.Message
            msgError(err)
            Return False
        Catch ex As Exception
            Dim err As String
            err = "Error al ejecutar el query" & vbCrLf & _
                  ex.Message
            msgError(err)
            Return False
        End Try
    End Function

    '---------------------------------------------------------------------------------------------------------'
    '  Esta función utiliza la conexión abierta para realizar el query pasado como parámetro y regresa un     '
    '  DataReader con los datos leidos                                                                        '
    '                                                                                                         '
    '  @param  query  El query que se va a ejecutar en la base de datos                                       '
    '  @return  Un OleDbDataReader con los datos leidos de la base de datos al ejecutar el query                '
    '---------------------------------------------------------------------------------------------------------'
    Function getDataReader(ByVal query As String) As OleDbDataReader
        Dim command As New OleDbCommand(query, connection)
        Try
            Return command.ExecuteReader(CommandBehavior.CloseConnection)
        Catch OleDbex As OleDbException
            Dim err As String
            err = "Error de base de datos al ejecutar el query" & vbCrLf & _
                  OleDbex.Message
            msgError(err)
        Catch ex As Exception
            msgError("Error al ejecutar el query")
        End Try
        Return Nothing
    End Function

    '---------------------------------------------------------------------------------------------------------'
    '  Esta función utiliza la conexión abierta para realizar el query pasado como parámetro y regresa un     '
    '  DataTable con los datos leidos                                                                         '
    '                                                                                                         '
    '  @param  query  El query que se va a ejecutar en la base de datos                                       '
    '  @return  Un DataTable con los datos leidos de la base de datos al ejecutar el query                    '
    '---------------------------------------------------------------------------------------------------------'
    Function getDataTable(ByVal query As String) As DataTable
        Dim command As New OleDbCommand(query, connection)
        Dim adapter As New OleDbDataAdapter(command)
        Dim table As New DataTable

        Try
            adapter.Fill(table)
            If table.Rows.Count > 0 Then
                Return table
            Else
                Return Nothing
            End If
        Catch OleDbex As OleDbException
            Dim err As String
            err = "Error de base de datos al ejecutar el query" & vbCrLf & _
                  OleDbex.Message
            msgError(err)
        Catch ex As Exception
            msgError("Error al ejecutar el query")
        End Try
        Return Nothing
    End Function

    '---------------------------------------------------------------------------------------------------------'
    '  Llena la forma pasada como parámetro utilizando el query pasado como parámetro. Dentro de la forma     '
    '  deben haber controles que tengan los mismos nombres que las columnas que se encuentran en el query.    '
    '  Por ejemplo, si el query es 'SELECT nombre FROM usuarios' debe haber un control llamado 'nombre' entre '
    '  los controles de la forma                                                                              '
    '                                                                                                         '
    '  @param  query  El query que se quiere ejecutar en la base de datos.                                    '
    '  @param  form   La forma que se quire llenar con los datos                                              '
    '---------------------------------------------------------------------------------------------------------'
    Sub showData(ByVal query As String, ByVal container As Control)
        Dim dt As DataTable
        Dim ctrl As Control
        dt = getDataTable(query)
        If Not dt Is Nothing Then
            For Each ctrl In container.Controls
                If dt.Columns.Contains(ctrl.Name) Then
                    If TypeOf (ctrl) Is TextBox Or TypeOf (ctrl) Is MaskedTextBox Then
                        ctrl.Text = dt.Rows(0)(ctrl.Name)
                    ElseIf TypeOf (ctrl) Is ComboBox Or TypeOf (ctrl) Is ListBox Then
                        DirectCast(ctrl, ComboBox).SelectedValue = dt.Rows(0)(ctrl.Name)
                    ElseIf TypeOf (ctrl) Is DateTimePicker Then
                        DirectCast(ctrl, DateTimePicker).Value = dt.Rows(0)(ctrl.Name)
                    Else
                        Try
                            ctrl.Text = dt.Rows(0)(ctrl.Name)
                        Catch ex As Exception
                        End Try
                    End If
                End If
                If ctrl.HasChildren Then
                    showData(query, ctrl)
                End If
            Next
        End If
    End Sub

    '---------------------------------------------------------------------------------------------------------'
    '  Llena el ComboBox pasado como parámetro con los datos que se recuperan del query pasado como parámetro.'
    '  El ComboBox se va a llenar mediante su ValueMember y su DisplayMember con la primera y segunda columna '
    '  regresadas del query respectivamente.                                                                  '
    '                                                                                                         '
    '  @param  lst    El ComboBox que se va a llenar con los datos del query                                  '
    '  @param  query  El query que se quiere ejecutar en la base de datos. El query debe tener la forma       '
    '                 SELECT INTEGER, $ FROM Tabla [...]                                                      '
    '                 en donde $ es un dato de cualquier tipo.                                                '
    '---------------------------------------------------------------------------------------------------------'
    Sub fillList(ByVal lst As Windows.Forms.ComboBox, ByVal query As String)
        Dim table As DataTable
        table = getDataTable(query)
        If Not table Is Nothing Then
            lst.DataSource = Nothing
            lst.Items.Clear()
            lst.DataSource = table
            If table.Columns.Count = 2 Then
                lst.ValueMember = table.Columns(0).ToString
                lst.DisplayMember = table.Columns(1).ToString
            Else
                lst.DisplayMember = table.Columns(0).ToString
            End If
        End If
    End Sub

    '---------------------------------------------------------------------------------------------------------'
    '  Llena el ListBox pasado como parámetro con los datos que se recuperan del query pasado como parámetro. '
    '  El ListBox se va a llenar mediante su ValueMember y su DisplayMember con la primera y segunda columna  '
    '  regresadas del query respectivamente.                                                                  '
    '                                                                                                         '
    '  @param  lst    El ListBox que se va a llenar con los datos del query                                   '
    '  @param  query  El query que se quiere ejecutar en la base de datos. El query debe tener la forma       '
    '                 SELECT INTEGER, $ FROM Tabla [...]                                                      ' 
    '                 en donde $ es un dato de cualquier tipo.                                                '
    '---------------------------------------------------------------------------------------------------------'
    Sub fillList(ByRef lst As Windows.Forms.ListBox, ByVal query As String)
        Dim table As DataTable
        table = getDataTable(query)
        If Not table Is Nothing Then
            lst.DataSource = table
            If table.Columns.Count = 2 Then
                lst.ValueMember = table.Columns(0).ToString
                lst.DisplayMember = table.Columns(1).ToString
            Else
                lst.ValueMember = table.Columns(0).ToString
            End If
        End If
    End Sub

    '---------------------------------------------------------------------------------------------------------'
    '  Llena el DataGrid pasado como parámetro con los datos que se recuperan del query pasado como           '
    '  parámetro.                                                                                             '
    '                                                                                                         '
    '  @param  grid   El DataGrid que se va a llenar con los datos del query                                  '
    '  @param  query  El query que se quiere ejecutar en la base de datos.                                    '
    '---------------------------------------------------------------------------------------------------------'
    Sub fillGrid(ByVal grid As Windows.Forms.DataGridView, ByVal query As String)
        Dim table As DataTable
        table = getDataTable(query)
        If Not table Is Nothing Then
            grid.DataSource = table
        Else
            grid.DataSource = New DataTable
        End If
    End Sub

End Module
